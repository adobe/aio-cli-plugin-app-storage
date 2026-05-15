export const makeTable = ({ data }) => data.map(row => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join('\n')).join('\n')
