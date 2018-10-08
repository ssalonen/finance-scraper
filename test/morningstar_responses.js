const fs = require('fs')
const path = require('path')
const etfFilePath = path.join(__dirname, 'morningstar_etf.html')
const stockFilePath = path.join(__dirname, 'morningstar_stock.html')
const fundFilePath = path.join(__dirname, 'morningstar_fund.html')
const fundFile2Path = path.join(__dirname, 'morningstar_fund2.html')
const seligsonFilePath = path.join(__dirname, 'rahamarkkina.csv')

module.exports = {
  etf: fs.readFileSync(etfFilePath),
  stock: fs.readFileSync(stockFilePath),
  fund: fs.readFileSync(fundFilePath),
  fund2: fs.readFileSync(fundFile2Path),
  seligsonRahamarkkina: fs.readFileSync(seligsonFilePath)
}
