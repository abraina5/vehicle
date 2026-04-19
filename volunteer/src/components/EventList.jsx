import { formatDateTime } from '../helpers/date';

function reminderSummary(reminderConfig) {
  if (!reminderConfig?.enabled) {
    return 'Reminder disabled';
  }

  const hoursBefore = Number(reminderConfig.hoursBefore || 0);
  const sendTime = reminderConfig.sendTime ? ` at ${reminderConfig.sendTime}` : '';
  return `${hoursBefore} hour(s) before${sendTime}`;
}

export function EventList({
  events,
  volunteersById = {},
  emptyMessage,
  onEdit,
  showAssignments = false,
  showReminder = false,
}) {
  if (!events.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="card-grid">
      {events.map((event) => (
        <article className="dashboard-card" key={event.id}>
          <div className="card-header-row">
            <div>
              <p className="eyebrow">Service Event</p>
              <h3>{event.topic}</h3>
            </div>
            <span className={`status-pill status-${event.status || 'scheduled'}`}>{event.status}</span>
          </div>

          <p className="card-meta">{formatDateTime(event.startAt)}</p>

          {event.location && <p className="card-meta">Location: {event.location}</p>}
          {event.description && <p className="card-copy">{event.description}</p>}

          {showAssignments && (
            <p className="card-meta">
              Assigned volunteers:{' '}
              {(event.assignedVolunteerIds || [])
                .map((volunteerId) => volunteersById[volunteerId]?.name || volunteersById[volunteerId]?.email || volunteerId)
                .join(', ') || 'None yet'}
            </p>
          )}

          {showReminder && <p className="card-meta">Reminder: {reminderSummary(event.reminderConfig)}</p>}

          {onEdit && (
            <button className="secondary-button" type="button" onClick={() => onEdit(event)}>
              Edit event
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
