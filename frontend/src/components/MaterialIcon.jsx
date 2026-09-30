const iconMap = {
  add: "fa-solid fa-plus",
  add_road: "fa-solid fa-road",
  alt_route: "fa-solid fa-route",
  arrow_back: "fa-solid fa-arrow-left",
  auto_awesome: "fa-solid fa-wand-magic-sparkles",
  badge: "fa-solid fa-id-badge",
  bolt: "fa-solid fa-bolt",
  business: "fa-solid fa-briefcase",
  calendar_today: "fa-regular fa-calendar",
  check: "fa-solid fa-check",
  check_circle: "fa-regular fa-circle-check",
  celebration: "fa-solid fa-champagne-glasses",
  close: "fa-solid fa-xmark",
  dashboard: "fa-solid fa-table-columns",
  delete: "fa-solid fa-trash",
  domain: "fa-solid fa-building",
  domain_add: "fa-solid fa-building",
  domain_disabled: "fa-solid fa-building-slash",
  done_all: "fa-solid fa-check-double",
  edit: "fa-solid fa-pen-to-square",
  error: "fa-solid fa-circle-exclamation",
  event: "fa-regular fa-calendar-check",
  event_note: "fa-regular fa-calendar",
  filter_alt: "fa-solid fa-filter",
  flag: "fa-solid fa-flag",
  format_list_bulleted: "fa-solid fa-list",
  history_edu: "fa-solid fa-book-open",
  info: "fa-solid fa-circle-info",
  lightbulb: "fa-regular fa-lightbulb",
  mail: "fa-regular fa-envelope",
  mail_lock: "fa-solid fa-envelope-open-text",
  map: "fa-solid fa-map",
  my_location: "fa-solid fa-location-crosshairs",
  navigation: "fa-solid fa-compass",
  note: "fa-regular fa-note-sticky",
  person: "fa-regular fa-user",
  psychology: "fa-solid fa-brain",
  playlist_add: "fa-solid fa-list-check",
  refresh: "fa-solid fa-rotate",
  save: "fa-solid fa-floppy-disk",
  schedule: "fa-regular fa-clock",
  search: "fa-solid fa-magnifying-glass",
  smart_toy: "fa-solid fa-robot",
  school: "fa-solid fa-graduation-cap",
  space_dashboard: "fa-solid fa-table-columns",
  stacks: "fa-solid fa-layer-group",
  subject: "fa-solid fa-align-left",
  timeline: "fa-solid fa-chart-line",
  trending_up: "fa-solid fa-arrow-trend-up",
  warning: "fa-solid fa-triangle-exclamation",
};

export default function MaterialIcon({
  name,
  className = "",
  ariaHidden = true,
}) {
  const iconClass = iconMap[name] || "fa-solid fa-circle-question";

  return (
    <i
      className={`material-icon ${iconClass} ${className}`.trim()}
      aria-hidden={ariaHidden}
    />
  );
}
