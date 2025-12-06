import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const responses = {
  etf: fs.readFileSync(path.join(__dirname, 'morningstar_etf.html')),
  etf2: fs.readFileSync(path.join(__dirname, 'morningstar_etf2.html')),
  stock: fs.readFileSync(path.join(__dirname, 'morningstar_stock.html')),
  stock2: fs.readFileSync(path.join(__dirname, 'morningstar_stock2.html')), // EDT timezone
  fund: fs.readFileSync(path.join(__dirname, 'morningstar_fund.html')),
  fund2: fs.readFileSync(path.join(__dirname, 'morningstar_fund2.html')),
  seligsonRahamarkkina: fs.readFileSync(path.join(__dirname, 'rahamarkkina.csv'))
}
