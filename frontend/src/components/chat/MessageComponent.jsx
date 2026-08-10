import { openExternalUrl } from '../../utils/security';

const MessageComponent = ({ components, onClick }) => {
  if (!components || components.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {components.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-2">
          {row.components.map((comp, j) => {
            if (comp.type === 2) {
              const isLink = comp.style === 5;

              if (isLink) {
                return (
                  <md-outlined-button key={j} type="button" onClick={() => openExternalUrl(comp.url)}>
                    {comp.label}
                  </md-outlined-button>
                );
              }
              
              return (
                <md-filled-tonal-button
                  key={j} 
                  onClick={(e) => { e.stopPropagation(); onClick(comp.customId); }}
                  disabled={comp.disabled}
                >
                  {comp.label}
                </md-filled-tonal-button>
              );
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
};

export default MessageComponent;
