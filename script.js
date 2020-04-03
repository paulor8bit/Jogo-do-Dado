$('#segundo').hide(0)
$('#novojogo').hide(0)

function getInteiroAleatorio (min, max) { 
    const valor = Math.random() * (max - min) + min
    return Math.floor(valor)
}

function adcionalinha (saida) { 
    let elemento_pai = document.body
    let titulo = document.createElement('p')
    let texto  = document.createTextNode(saida)
    titulo.appendChild(texto)
    elemento_pai.appendChild(titulo)
}  

const jogadas = {
    opcao1:  getInteiroAleatorio(1, 7), 
    opcao2:  getInteiroAleatorio(1, 7), 
    sorte: getInteiroAleatorio(1, 7),
    foto: getInteiroAleatorio(1, 49)
    }
 
const rolagem = {
    somar: (jogadas.opcao1+jogadas.opcao2) + jogadas.sorte,
    diminuir: (jogadas.opcao1+jogadas.opcao2) - jogadas.sorte
}

document.getElementById("jogadasOpcao").innerHTML = (jogadas.opcao1+jogadas.opcao2)
dado1 = document.getElementById("jogadasOpcao1")
dado1.src = `dados/dado${jogadas.opcao1}.png`
dado2 = document.getElementById("jogadasOpcao2")
dado2.src = `dados/dado${jogadas.opcao2}.png`


function verifica (resultado) { 
    if (resultado >= 6 && resultado <= 12){
        let saida2= `Parabéns você venceu! :D `
        adcionalinha(saida2)
        img = document.getElementById("imagem")
        img.src = `dados/g${jogadas.foto}.png`
        dado3 = document.getElementById("jogadasOpcao3")
        dado3.src = `dados/dado${jogadas.sorte}.png`
        console.log(jogadas.sorte)
      }
     else {
        let saida2= `Que pena, você perde. =[`
        adcionalinha(saida2)
        img = document.getElementById("imagem")
        img.src = `dados/p${jogadas.foto}.png`
        dado3 = document.getElementById("jogadasOpcao3")
        dado3.src = `dados/dado${jogadas.sorte}.png`
        console.log(jogadas.sorte)
       }
 
 


}

// function verificaDado (dadoImagem1) {


// }

let umavez = 0 

let botaoAdicionar = document.querySelector("#menor")
botaoAdicionar.addEventListener("click", function(event) {
    event.preventDefault()
    let somar = (umavez++)
    if (somar <= 0) {
    $('#segundo, #novojogo').show(0)
    $('#menor, #maior').hide(0)
    adcionalinha(`O resutado da subtração do terceiro dado da:  ${rolagem.diminuir}`)
    const resultado = rolagem.diminuir
    adcionalinha(verifica(resultado))}
    else {}
    
    
})

let botaoAdicionarm = document.querySelector("#maior")
botaoAdicionarm.addEventListener("click", function(event) {
    event.preventDefault()
    let somar = (umavez++)
    if (somar <= 0) {
    $('#segundo, #novojogo').show(0)
    $('#menor, #maior').hide(0)
    adcionalinha(`O resultado da soma do terceiro dado da: ${rolagem.somar}`)
    const resultado = rolagem.somar
    adcionalinha(verifica(resultado))}
    else {}

})


let botaoAdicionarn = document.querySelector("#novojogo")
botaoAdicionarn.addEventListener("click", function(event) {
    // event.preventDefault()
    $('#segundo, novojogo').hide(0)
    $('#menor, #maior').show(0)

})