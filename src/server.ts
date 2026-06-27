import express from 'express'
const app = express()
const port = 3000

import routesUsuario from "./routes/usuario"
import routesEventos from "./routes/evento"
import routesIngresso from "./routes/ingresso"
import routesInscricao from "./routes/inscricao"
import alterarSenha from "./routes/alterarSenha"
app.use(express.json())

app.use("/usuario", routesUsuario)
app.use("/eventos", routesEventos)
app.use("/ingresso", routesIngresso)
app.use("/inscricao", routesInscricao)
app.use("/usuario/alterar-senha", alterarSenha)

app.get('/', (req, res) => {
  res.send('API: Sistema de Eventos')
})

app.listen(port, () => {
  console.log(`Servidor Rodando na Porta: ${port}`)
})
