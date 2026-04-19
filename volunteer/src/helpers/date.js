export function asDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  return new Date(value);
}

export function createDateFromInputs(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return null;
  }

  return new Date(`${dateValue}T${timeValue}:00`);
}

export function splitDateTime(value) {
  const date = asDate(value);

  if (!date) {
    return { date: '', time: '' };
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

export function formatDateTime(value) {
  const date = asDate(value);

  if (!date) {
    return 'Not scheduled yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function calculateReminderPreview(dateValue, timeValue, hoursBefore, sendTime) {
  const eventStart = createDateFromInputs(dateValue, timeValue);

  if (!eventStart) {
    return '';
  }

  const reminderDate = new Date(eventStart);
  reminderDate.setHours(reminderDate.getHours() - Number(hoursBefore || 0));

  if (sendTime) {
    const [hours, minutes] = sendTime.split(':').map(Number);
    reminderDate.setHours(hours, minutes, 0, 0);
  }

  return formatDateTime(reminderDate);
}
