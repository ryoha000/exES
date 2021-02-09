import { html } from "lit-html"
import Table from './table'
import { RowInfo } from './table_row'
import { styleMap } from 'lit-html/directives/style-map.js';

const Item = (title: string, header: string[], values: RowInfo[], grow?: number) => {
  const styles = {
    'flex-grow': `${grow}`
  }
  return html`
    <div style="${grow ? styleMap(styles) : ''}">
      <h3>${title}</h3>
      ${Table(header, values)}
    </div>
  `
}

export default Item
