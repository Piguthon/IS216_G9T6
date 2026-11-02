// Turns one part of a route from the ranking into the words shown on the summary page.
// OneMap calls the two ends of a trip "Origin" and "Destination".
function place(name, code, destination) {
  if (name === 'Origin') return 'your start point'
  if (name === 'Destination') return destination
  return code && !name.includes(code) ? `${name} (${code})` : name
}

function titleCase(text) {
  return text.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function describeStep(step, destination) {
  const from = place(step.from, step.fromCode, destination)
  const to = place(step.to, step.toCode, destination)
  const { minutes } = step

  if (step.mode === 'WALK') return { label: 'Walk', details: `To ${to}`, minutes }
  if (step.mode === 'CAR') return { label: 'Drive', details: `To ${to}`, minutes }
  if (step.mode === 'PARK') return { label: 'Park', details: `And walk to ${to}`, minutes }

  const label = step.mode === 'BUS' ? `Bus ${step.route}` : titleCase(step.routeName || step.mode)
  const stops = step.stops === 1 ? '1 stop' : `${step.stops} stops`
  return { label, details: `Board at ${from}, alight at ${to} (${stops})`, minutes }
}
