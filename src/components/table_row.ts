import { html } from "lit-html";

export type RowInfo = {
  text: string | number
  url?: string
}[]

export const TableRow = (rowData: RowInfo) => html`
  <tr>
    ${rowData.map(v => {
      if (v.url) {
        return html`
          <td><a href="${v.url}" target="_blank" rel="noopener">${v.text}</a></td>
        `
      }
      return html`<td>${v.text}</td>`
    })}
  </tr>
`
