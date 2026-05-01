import { Link } from 'react-router-dom';

export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

function buildCoverStyle(imageUrl) {
  if (!imageUrl) {
    return undefined;
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(3, 6, 10, 0.08), rgba(3, 6, 10, 0.82)), url("${imageUrl}")`
  };
}

export function Button({
  children,
  className,
  href,
  to,
  variant = 'primary',
  size = 'md',
  ...props
}) {
  const classes = cn('button', `button-${variant}`, `button-${size}`, className);

  if (to) {
    return (
      <Link className={classes} to={to} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a className={classes} href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'default' }) {
  return <span className={cn('badge', `badge-${tone}`)}>{children}</span>;
}

export function Card({ children, className }) {
  return <article className={cn('card-surface', className)}>{children}</article>;
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}

export function Input(props) {
  return <input className="input-control" {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className="input-control" {...props}>
      {children}
    </select>
  );
}

export function Textarea(props) {
  return <textarea className="input-control textarea-control" {...props} />;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Carregando...' }) {
  return (
    <div className="loading-state">
      <span className="loading-orb" />
      <p>{label}</p>
    </div>
  );
}

export function DataTable({ columns, rows, empty }) {
  if (!rows?.length) {
    return empty || <EmptyState title="Nada por aqui" description="Nao ha dados para exibir." />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ open, title, description, children, actions, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            x
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function NewsCard({ item }) {
  return (
    <Card className="content-showcase">
      <div
        className={cn('card-cover', item.imageUrl ? 'has-image' : 'variant-news')}
        style={buildCoverStyle(item.imageUrl)}
      />
      <div className="card-stack">
        <div className="card-meta">
          <Badge tone="lime">{item.category}</Badge>
          <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : 'Rascunho'}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.descriptionText}</p>
      </div>
    </Card>
  );
}

export function ServerCard({ item, liveStatus, action }) {
  const statusText = liveStatus?.online
    ? `${liveStatus.playersOnline}/${liveStatus.playerLimit || '?'} online`
    : item.statusLabel || 'Offline';

  return (
    <Card className="content-showcase">
      <div
        className={cn('card-cover', item.imageUrl ? 'has-image' : 'variant-server')}
        style={buildCoverStyle(item.imageUrl)}
      />
      <div className="card-stack">
        <div className="card-meta">
          <Badge tone={liveStatus?.online ? 'success' : 'muted'}>{statusText}</Badge>
          {item.permissionRequired ? <span>{item.permissionRequired}</span> : null}
        </div>
        <h3>{item.name}</h3>
        <p>{item.descriptionText}</p>
        {action}
      </div>
    </Card>
  );
}

export function DiamondPackageCard({ item, action }) {
  return (
    <Card className="package-card">
      <div className="package-head">
        <div>
          {item.highlightLabel ? <Badge tone="lime">{item.highlightLabel}</Badge> : null}
          <h3>{item.name}</h3>
          <small className="package-kicker">Economia premium</small>
        </div>
        <strong>
          {(item.priceCents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          })}
        </strong>
      </div>
      <p>{item.descriptionText}</p>
      <ul className="package-list">
        <li>{item.diamondAmount} diamantes</li>
        <li>{item.bonusAmount} bonus</li>
      </ul>
      {action}
    </Card>
  );
}
