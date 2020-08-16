const fs = require('fs')
const path = require('path')

module.exports = {
  etf: fs.readFileSync(path.join(__dirname, 'morningstar_etf.html')),
  etf2: fs.readFileSync(path.join(__dirname, 'morningstar_etf2.html')),
  stock: fs.readFileSync(path.join(__dirname, 'morningstar_stock.html')),
  fund: fs.readFileSync(path.join(__dirname, 'morningstar_fund.html')),
  fund2: fs.readFileSync(path.join(__dirname, 'morningstar_fund2.html')),
  seligsonRahamarkkina: fs.readFileSync(path.join(__dirname, 'rahamarkkina.csv'))
}
