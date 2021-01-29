import { html } from "lit-html"
import Table from './table'
import { RowInfo } from './table_row'

const Item = (title: string, header: string[], values: RowInfo[]) => html`
  <div>
    <h3>${title}</h3>
    ${Table(header, values)}
  </div>
`

export default Item
