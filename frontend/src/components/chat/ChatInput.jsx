import { useEffect, useRef, useState, useCallback } from 'react';
import { FaFaceSmile, FaFileCirclePlus, FaImage, FaNoteSticky, FaPaperPlane, FaPlus, FaXmark } from 'react-icons/fa6';

import MessageReply from './MessageReply';
import SlashCommandList from './SlashCommandList';

const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;

const ChatInput = ({ channelName, disabled, onSend, replyingTo, onCancelReply, onToggleMention, onEmojiClick, onStickerClick, onDraftChange, slashCommands = [], onSlashCommand, showSendButton = true }) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandOptions, setCommandOptions] = useState([]);
  const [currentCommand, setCurrentCommand] = useState(null);
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);
  const filesRef = useRef([]);
  const progressRef = useRef({});
  const progressTimersRef = useRef({});

  useEffect(() => {
    const handleEmojiInsert = (e) => {
      setText((prev) => prev + e.detail);
      textAreaRef.current?.focus();
    };
    window.addEventListener('insert-emoji', handleEmojiInsert);
    return () => window.removeEventListener('insert-emoji', handleEmojiInsert);
  }, []);

  filesRef.current = files;

  useEffect(() => {
    const timers = progressTimersRef.current;
    return () => {
      filesRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      Object.values(timers).forEach((timer) => window.clearInterval(timer));
    };
  }, []);

  const setDraftProgress = (id, progress) => {
    const nextProgress = Math.max(0, Math.min(100, Math.round(progress)));
    progressRef.current[id] = nextProgress;
    onDraftChange?.((draft) => draft ? ({
      ...draft,
      files: draft.files.map((draftFile) => draftFile.id === id ? { ...draftFile, progress: nextProgress } : draftFile)
    }) : draft);
  };

  const animateDraftProgress = (id, target, duration = 420) => new Promise((resolve) => {
    const start = progressRef.current[id] || 0;
    const end = Math.max(start, Math.min(100, Math.round(target)));
    if (end === start) {
      resolve();
      return;
    }

    if (progressTimersRef.current[id]) window.clearInterval(progressTimersRef.current[id]);
    const startedAt = performance.now();
    progressTimersRef.current[id] = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDraftProgress(id, start + ((end - start) * eased));
      if (t >= 1) {
        window.clearInterval(progressTimersRef.current[id]);
        delete progressTimersRef.current[id];
        resolve();
      }
    }, 24);
  });

  const startDraftProgress = (id, ceiling = 86, intervalMs = 90) => {
    if (progressTimersRef.current[id]) window.clearInterval(progressTimersRef.current[id]);
    progressTimersRef.current[id] = window.setInterval(() => {
      const current = progressRef.current[id] || 0;
      if (current >= ceiling) return;
      const step = Math.max(1, Math.ceil((ceiling - current) * 0.08));
      setDraftProgress(id, Math.min(ceiling, current + step));
    }, intervalMs);
  };

  const stopDraftProgress = (id) => {
    if (!progressTimersRef.current[id]) return;
    window.clearInterval(progressTimersRef.current[id]);
    delete progressTimersRef.current[id];
  };

  const fileToPayload = (item) => new Promise((resolve, reject) => {
    const { file, id } = item;
    const reader = new FileReader();
    startDraftProgress(id, 84, 80);
    reader.onload = async () => {
      stopDraftProgress(id);
      await animateDraftProgress(id, 88, 260);
      resolve({
      name: file.name,
      type: file.type,
      size: file.size,
      data: reader.result
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const clearFiles = () => {
    files.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setFiles([]);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((!text.trim() && files.length === 0) || disabled || sending) return;

    if (currentCommand) {
      onSlashCommand?.(currentCommand, commandOptions);
      setText('');
      setCurrentCommand(null);
      setCommandOptions([]);
      return;
    }

    setSending(true);
    setSendError('');
    onDraftChange?.({
      id: `draft-${Date.now()}`,
      status: 'sending',
      content: text.trim(),
      files: files.map((item) => ({
        id: item.id,
        name: item.file.name,
        size: item.file.size,
        type: item.file.type,
        previewUrl: item.previewUrl,
        progress: 0
      }))
    });
    progressRef.current = Object.fromEntries(files.map((item) => [item.id, 0]));
    try {
      const payloadFiles = await Promise.all(files.map((item) => fileToPayload(item)));
      if (payloadFiles.length > 0) {
        files.forEach((item) => startDraftProgress(item.id, 96, 160));
      }
      const result = await onSend(text, payloadFiles);
      if (result && result.ok === false) {
        throw new Error(result.error || 'メッセージの送信に失敗しました');
      }
      files.forEach((item) => stopDraftProgress(item.id));
      if (payloadFiles.length > 0) {
        await Promise.all(files.map((item) => animateDraftProgress(item.id, 100, 220)));
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
      setText('');
      clearFiles();
      if (fileInputRef.current) fileInputRef.current.value = '';
      onDraftChange?.(null);
    } catch (error) {
      files.forEach((item) => stopDraftProgress(item.id));
      setSendError(error.message || 'メッセージの送信に失敗しました');
      onDraftChange?.((draft) => draft ? {
        ...draft,
        status: 'failed',
        error: error.message || 'メッセージの送信に失敗しました'
      } : draft);
    } finally {
      setSending(false);
    }
  };

  const addFiles = (fileList) => {
    const candidates = Array.from(fileList || []);
    const existingBytes = files.reduce((sum, item) => sum + item.file.size, 0);
    if (files.length + candidates.length > MAX_FILES) {
      setSendError(`添付できるファイルは${MAX_FILES}個までです`);
      return;
    }
    if (candidates.some((file) => file.size > MAX_FILE_BYTES)) {
      setSendError('1ファイルの上限は10MBです');
      return;
    }
    if (existingBytes + candidates.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_FILE_BYTES) {
      setSendError('添付ファイルの合計上限は20MBです');
      return;
    }
    setSendError('');
    const nextFiles = candidates.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID?.() || Math.random()}`,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setFiles((prev) => [...prev, ...nextFiles]);
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const canSend = !disabled && !sending && (text.trim() || files.length > 0);

  const filteredCommands = slashCommands.filter(cmd => {
    const name = cmd.name.toLowerCase();
    const query = commandQuery.toLowerCase();
    return name.includes(query);
  });

  const handleTextChange = (e) => {
    const value = e.target.value;
    setText(value);

    if (value.startsWith('/') && !currentCommand) {
      const query = value.slice(1);
      setCommandQuery(query);
      setShowSlashCommands(true);
    } else if (currentCommand && value.includes(' ')) {
      setShowSlashCommands(false);
    } else {
      setShowSlashCommands(false);
      setCommandQuery('');
    }
  };

  const handleSelectCommand = useCallback((cmd) => {
    setCurrentCommand(cmd);
    setText(`/${cmd.name} `);
    setShowSlashCommands(false);
    setCommandQuery('');
    textAreaRef.current?.focus();
  }, []);

  const handleCloseSlashCommands = useCallback(() => {
    setShowSlashCommands(false);
    setText('/');
    setCommandQuery('');
    textAreaRef.current?.focus();
  }, []);

  return (
    <div className="app-composition">
      {files.length > 0 && !sending && (
        <div className="app-file-carousel">
          {files.map(({ id, file, previewUrl }) => (
            <div key={id} className="app-file-card">
              <button type="button" className="app-file-preview" onClick={() => removeFile(id)} title="ファイルを削除">
                <md-ripple />
                {previewUrl ? <img src={previewUrl} alt="" /> : <FaFileCirclePlus />}
                <span className="app-file-overlay">
                  <FaXmark />
                </span>
              </button>
              <div className="app-file-meta">
                <div className="app-file-name">{file.name}</div>
                <div className="app-file-size">{(file.size / 1024).toFixed(1)}KB</div>
              </div>
            </div>
          ))}
          <button type="button" className="app-file-add" onClick={() => fileInputRef.current?.click()} title="ファイルを追加">
            <md-ripple />
            <FaPlus />
          </button>
        </div>
      )}

      {sendError && (
        <div className="mb-2 px-4 py-2 rounded-2xl text-[#ffdad6] bg-[color-mix(in_srgb,var(--app-error)_16%,var(--app-surface-container-high))] text-[13px] font-semibold">
          {sendError}
        </div>
      )}

      {replyingTo && (
        <div className="app-reply-preview">
          <span className="shrink-0 font-[650]">返信先</span>
          <MessageReply message={replyingTo.message} mention={replyingTo.mention} noDecorations />
          <md-filled-tonal-button type="button" class="app-reply-mention" onClick={onToggleMention} title="返信先にメンション">
            {replyingTo.mention ? 'オン' : 'オフ'}
          </md-filled-tonal-button>
          <md-icon-button type="button" class="m3-icon-button compact" onClick={onCancelReply} title="返信をキャンセル">
            <FaXmark />
          </md-icon-button>
        </div>
      )}

      {currentCommand && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-[var(--app-primary-container)] text-[var(--app-on-primary-container)] text-sm flex items-center gap-2">
          <span className="font-medium">/{currentCommand.name}</span>
          <span className="text-xs opacity-70">{currentCommand.description}</span>
          <button type="button" className="ml-auto text-xs opacity-70 hover:opacity-100" onClick={() => { setCurrentCommand(null); setText(''); setCommandOptions([]); }}>
            <FaXmark size={12} />
          </button>
        </div>
      )}

      {showSlashCommands && (
        <SlashCommandList
          commands={filteredCommands}
          onSelect={handleSelectCommand}
          onClose={handleCloseSlashCommands}
        />
      )}

      <div className="app-message-box-base">
        <div className="shrink-0 flex items-center justify-center self-center w-[42px]">
          <md-icon-button type="button" class="m3-icon-button" onClick={() => fileInputRef.current?.click()} title="ファイルを添付">
            <FaPlus />
          </md-icon-button>
          <input type="file" hidden multiple ref={fileInputRef} onChange={(e) => addFiles(e.target.files)} />
        </div>

        <textarea
          data-chat-input
          ref={textAreaRef}
          rows={Math.min(text.split('\n').length || 1, 10)}
          value={text}
          maxLength={4000}
          onChange={handleTextChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={channelName ? `#${channelName}へメッセージを送信` : 'メッセージを送信'}
          disabled={disabled || sending}
        />

        <div className="shrink-0 flex items-center gap-0.5">
          <md-icon-button type="button" class="m3-icon-button" onClick={onStickerClick} title="スタンプ">
            <FaImage />
          </md-icon-button>

          <md-icon-button type="button" class="m3-icon-button" onClick={onEmojiClick} title="絵文字">
            <FaFaceSmile />
          </md-icon-button>

          {showSendButton && <button
            type="button"
            className="app-send-button"
            disabled={!canSend}
            onClick={handleSubmit}
            title="メッセージを送信"
          >
            <FaPaperPlane />
          </button>}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
