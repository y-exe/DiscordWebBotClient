import useTwemoji from '../../hooks/useTwemoji';

const TwemojiText = ({ children, className = '' }) => {
  const { ref } = useTwemoji();
  return <span ref={ref} className={className}>{String(children || '')}</span>;
};

export default TwemojiText;
