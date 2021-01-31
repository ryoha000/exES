import { html } from "lit-html";
import { TableRow, RowInfo } from './table_row'
import { styleMap } from 'lit-html/directives/style-map.js';

export const Table = (header: string[], values: RowInfo[]) => {
  const styles = {
    overflow: "auto",
    'max-height': "250px"
  }
  return html`
    <div style="${styleMap(styles)}">
      <table>
        <tbody>
          <tr>
            ${header.map(v => html`<th>${v}</th>`)}
          </tr>
          ${values.map(TableRow)}
        </tbody>
      </table>
    </div>
  `
}

export default Table
