import Symbol from '../common/Symbol';

const MessageToolbar = ({ message, isMe, canManageMessages = false, onReply, onEdit, onDelete, onOpenMenu, onReactionOpen }) => {
  return (
    <div className="app-toolbar">
      <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => { e.stopPropagation(); onReply(message); }} title="返信">
        <Symbol size={20}>reply</Symbol>
      </md-icon-button>
      <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => { e.stopPropagation(); onReactionOpen(e, message.id); }} title="リアクション">
        <Symbol size={20}>emoji_emotions</Symbol>
      </md-icon-button>
      {isMe && (
        <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => { e.stopPropagation(); onEdit(message); }} title="編集">
          <Symbol size={20}>edit</Symbol>
        </md-icon-button>
      )}
      {(isMe || canManageMessages) && (
        <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey) onDelete(message);
          else if (window.confirm('メッセージを削除しますか?')) onDelete(message);
        }} title="削除">
          <Symbol size={20}>delete</Symbol>
        </md-icon-button>
      )}
      <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => { e.stopPropagation(); onOpenMenu(e, message); }} title="その他">
        <Symbol size={20}>more_vert</Symbol>
      </md-icon-button>
    </div>
  );
};

export default MessageToolbar;
