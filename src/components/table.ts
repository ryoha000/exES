import { html } from "lit-html";
import { TableRow, RowInfo } from './table_row'

export const Table = (header: string[], values: RowInfo[]) => html`
  <table>
    <tbody>
      <tr>
        ${header.map(v => html`
          <th>${v}</th>
        `)}
      </tr>
      <tr>
        ${values.map(TableRow)}
      </tr>
    </tbody>
  </table>
`

export default Table
