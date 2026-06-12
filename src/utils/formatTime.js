export function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) {
    return "-";
  }

  const totalSeconds = Number(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const rest = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(rest)}`;
  }

  return `${minutes}:${pad(rest)}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}
