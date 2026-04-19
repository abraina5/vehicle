export const DEFAULT_REMINDER_TEMPLATE =
  'Hi {{name}}, this is a reminder for {{topic}} on {{date}} at {{time}}. Reply to your coordinator if anything changes.';

export function renderReminderPreview(template, context) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? '');
}
