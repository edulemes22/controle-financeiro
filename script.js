// Variáveis globais
let meses = {};
let mesAtual = '';
let mesSelecionado = '';
let paginaAtual = 1;
const itensPorPagina = 10;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    configurarAbas();
    configurarEventListeners();
    inicializarMes();
    atualizarInterface();
});

// Configurar abas
function configurarAbas() {
    document.querySelectorAll('.aba').forEach(aba => {
        aba.addEventListener('click', function() {
            const abaId = this.getAttribute('data-aba');
            
            // Remover classe ativa de todas as abas
            document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));
            document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativa'));
            
            // Adicionar classe ativa à aba clicada
            this.classList.add('ativa');
            document.getElementById(`conteudo-${abaId}`).classList.add('ativa');
            
            // Atualizar a interface quando mudar de aba
            atualizarInterface();
        });
    });
}

// Configurar event listeners
function configurarEventListeners() {
    // Controle de mês
    document.getElementById('selecionar-mes').addEventListener('change', function() {
        mesSelecionado = this.value;
        atualizarInterface();
    });
    
    document.getElementById('novo-mes').addEventListener('click', criarNovoMes);
    
    // Configuração
    document.getElementById('salvar-configuracao').addEventListener('click', salvarConfiguracao);
    document.getElementById('salario').addEventListener('input', calcularTotalReceitas);
    document.getElementById('outras-receitas').addEventListener('input', calcularTotalReceitas);
    
    // Adicionar movimentação
    document.getElementById('form-movimentacao').addEventListener('submit', adicionarMovimentacao);
    document.getElementById('tipo').addEventListener('change', function() {
        const categoriaSelect = document.getElementById('categoria');
        if (this.value === 'receita') {
            // Opções para receitas
            categoriaSelect.innerHTML = `
                <option value="Salario">Salário</option>
                <option value="Extra">Extra</option>
                <option value="Outros">Outros</option>
            `;
        } else {
            // Opções para gastos
            categoriaSelect.innerHTML = `
                <option value="">Selecione...</option>
                <option value="Combustivel">Combustível</option>
                <option value="Investimento">Investimento</option>
                <option value="Moradia">Moradia</option>
                <option value="Saude">Saúde</option>
                <option value="Mercado">Mercado</option>
                <option value="Viagem">Viagem</option>
                <option value="Estudos">Estudos</option>
                <option value="Conta Residencial">Conta Residencial</option>
                <option value="Comer Fora">Comer Fora</option>
                <option value="Ifood">Ifood</option>
                <option value="Lazer">Lazer</option>
                <option value="Roupas">Roupas</option>
                <option value="Compras">Compras</option>
                <option value="Servicos">Serviços</option>
                <option value="Carro">Carro</option>
                <option value="Outros">Outros</option>
            `;
        }
    });
    
    // Filtros
    document.getElementById('filtro-descricao').addEventListener('input', filtrarMovimentacoes);
    document.getElementById('filtro-tipo').addEventListener('change', filtrarMovimentacoes);
    document.getElementById('filtro-categoria').addEventListener('change', filtrarMovimentacoes);
    document.getElementById('filtro-pessoa').addEventListener('change', filtrarMovimentacoes);
    document.getElementById('filtro-meio-pagamento').addEventListener('change', filtrarMovimentacoes);
}

// Inicializar o mês
function inicializarMes() {
    const hoje = new Date();
    mesAtual = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    mesSelecionado = mesAtual;
    
    // Verificar se já existe dados para o mês atual
    if (!meses[mesAtual]) {
        meses[mesAtual] = {
            salario: 0,
            outrasReceitas: 0,
            saldoAnterior: 0,
            movimentacoes: []
        };
    }
    
    atualizarSeletorMeses();
}

// Criar novo mês
function criarNovoMes() {
    const nomeMes = prompt("Digite o nome do novo mês (ex: 2024-01):", mesAtual);
    if (!nomeMes) return;
    
    if (meses[nomeMes]) {
        alert("Já existe um mês com este nome!");
        return;
    }
    
    // Calcular saldo do mês anterior
    let saldoAnterior = 0;
    const mesesArray = Object.keys(meses);
    if (mesesArray.length > 0) {
        const ultimoMes = mesesArray[mesesArray.length - 1];
        const movimentacoes = meses[ultimoMes].movimentacoes || [];
        const salario = meses[mesSelecionado].salario || 0;
        const outrasReceitas = meses[mesSelecionado].outrasReceitas || 0;
        const saldoAnteriorMes = meses[ultimoMes].saldoAnterior || 0;
        const receitas = movimentacoes.filter(m => m.tipo === 'receita').reduce((sum, m) => sum + m.valor, 0);
        const gastosOutrasPessoas = movimentacoes.filter(m => m.tipo === 'gasto' && m.pessoa !== 'Eduardo').reduce((sum, m) => sum + Math.abs(m.valor), 0);
        const totalReceitas = salario + outrasReceitas + receitas + saldoAnteriorMes + gastosOutrasPessoas;
        const gastos = movimentacoes.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + Math.abs(m.valor), 0);
        saldoAnterior = totalReceitas - gastos;
        
        // Processar parcelamentos pendentes do mês anterior
        processarParcelamentosPendentes(ultimoMes, nomeMes);
    }
    
    // Criar novo mês
    meses[nomeMes] = {
        salario: 0,
        outrasReceitas: 0,
        saldoAnterior: saldoAnterior,
        movimentacoes: meses[nomeMes] ? meses[nomeMes].movimentacoes : [] // Preserva movimentações se já existir
    };
    
    mesSelecionado = nomeMes;
    salvarDados();
    atualizarSeletorMeses();
    atualizarInterface();
}

// Processar parcelamentos pendentes do mês anterior
function processarParcelamentosPendentes(mesOrigem, mesDestino) {
    // Verificar se o mês de origem existe
    if (!meses[mesOrigem] || !meses[mesOrigem].movimentacoes) {
        console.log(`Mês de origem ${mesOrigem} não encontrado ou sem movimentações`);
        return;
    }
    
    const movimentacoes = meses[mesOrigem].movimentacoes;
    
    movimentacoes.forEach(movimentacao => {
        // Verificar se é um gasto parcelado com parcelas pendentes
        if (movimentacao.tipo === 'gasto' && movimentacao.parcelas && 
            movimentacao.parcelas.total > 1) {
            
            const parcelasPagas = movimentacao.parcelas.pagas || 1;
            const parcelasRestantes = movimentacao.parcelas.total - parcelasPagas;
            
            if (parcelasRestantes > 0) {
                // Garantir que o mês de destino existe
                if (!meses[mesDestino]) {
                    meses[mesDestino] = {
                        salario: 0,
                        outrasReceitas: 0,
                        saldoAnterior: 0,
                        movimentacoes: []
                    };
                }
                
                // Garantir que o array de movimentações existe
                if (!meses[mesDestino].movimentacoes) {
                    meses[mesDestino].movimentacoes = [];
                }
                
                // Adicionar parcela ao novo mês
                const novaParcela = {
                    id: Date.now() + Math.random(), // ID único
                    data: new Date().toISOString().split('T')[0],
                    valor: movimentacao.valor,
                    descricao: `${movimentacao.descricao}`,
                    meioPagamento: movimentacao.meioPagamento,
                    pessoa: movimentacao.pessoa,
                    categoria: movimentacao.categoria,
                    tipo: 'gasto',
                    parcelas: {
                        total: movimentacao.parcelas.total,
                        atual: parcelasPagas + 1,
                        origem: movimentacao.id,
                        pagas: parcelasPagas + 1
                    }
                };
                
                meses[mesDestino].movimentacoes.push(novaParcela);
                
                // Atualizar parcela paga no mês anterior
                movimentacao.parcelas.pagas = parcelasPagas + 1;
            }
        }
    });
    
    salvarDados();
}

// Carregar dados do localStorage
function carregarDados() {
    const dadosSalvos = localStorage.getItem('controleFinanceiro');
    
    if (dadosSalvos) {
        const dados = JSON.parse(dadosSalvos);
        meses = dados.meses || {};
        mesAtual = dados.mesAtual || '';
        mesSelecionado = dados.mesSelecionado || mesAtual;
    }
}

// Salvar dados no localStorage
function salvarDados() {
    const dados = {
        meses: meses,
        mesAtual: mesAtual,
        mesSelecionado: mesSelecionado
    };
    
    localStorage.setItem('controleFinanceiro', JSON.stringify(dados));
}

// Atualizar seletor de meses
function atualizarSeletorMeses() {
    const seletor = document.getElementById('selecionar-mes');
    seletor.innerHTML = '';
    
    Object.keys(meses).sort().reverse().forEach(mes => {
        const option = document.createElement('option');
        option.value = mes;
        option.textContent = formatarNomeMes(mes);
        if (mes === mesSelecionado) {
            option.selected = true;
        }
        seletor.appendChild(option);
    });
}

// Calcular total de receitas
function calcularTotalReceitas() {
    const salario = parseFloat(document.getElementById('salario').value) || 0;
    const outrasReceitas = parseFloat(document.getElementById('outras-receitas').value) || 0;
    const saldoAnterior = meses[mesSelecionado]?.saldoAnterior || 0;
    const total = salario + outrasReceitas + saldoAnterior;
    
    document.getElementById('total-receitas').value = total.toFixed(2);
}

// Salvar configuração
function salvarConfiguracao() {
    const salario = parseFloat(document.getElementById('salario').value) || 0;
    const outrasReceitas = parseFloat(document.getElementById('outras-receitas').value) || 0;
    const saldoAnterior = parseFloat(document.getElementById('saldo-anterior').value) || 0;
    
    if (!meses[mesSelecionado]) {
        meses[mesSelecionado] = {
            salario: 0,
            outrasReceitas: 0,
            saldoAnterior: 0,
            movimentacoes: []
        };
    }
    
    meses[mesSelecionado].salario = salario;
    meses[mesSelecionado].outrasReceitas = outrasReceitas;
    meses[mesSelecionado].saldoAnterior = saldoAnterior;
    
    salvarDados();
    
    document.getElementById('status-configuracao').textContent = 'Configuração salva com sucesso!';
    document.getElementById('status-configuracao').style.color = '#27ae60';
    
    setTimeout(() => {
        document.getElementById('status-configuracao').textContent = '';
    }, 3000);
    
    atualizarInterface();
}

// Adicionar movimentação
function adicionarMovimentacao(event) {
    event.preventDefault();
    
    if (!meses[mesSelecionado]) {
        alert('Por favor, configure o mês primeiro na aba de Configuração.');
        return;
    }
    
    const tipo = document.getElementById('tipo').value;
    const data = document.getElementById('data').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const descricao = document.getElementById('descricao').value;
    const meioPagamento = document.getElementById('meio-pagamento').value;
    const pessoa = document.getElementById('pessoa').value;
    const categoria = document.getElementById('categoria').value;
    const parcelas = parseInt(document.getElementById('parcelas').value) || 1;
    
    if (!data || isNaN(valor) || valor <= 0 || !descricao || !meioPagamento || !pessoa || !categoria) {
        alert('Por favor, preencha todos os campos obrigatórios corretamente.');
        return;
    }
    
    const novaMovimentacao = {
        id: Date.now() + Math.random(), // ID único
        data,
        valor: tipo === 'gasto' ? -Math.abs(valor) : Math.abs(valor),
        descricao,
        meioPagamento,
        pessoa,
        categoria,
        tipo,
        parcelas: parcelas > 1 ? { total: parcelas, atual: 1, pagas: 1 } : null
    };
    
    // Garantir que o array de movimentações existe
    if (!meses[mesSelecionado].movimentacoes) {
        meses[mesSelecionado].movimentacoes = [];
    }
    
    meses[mesSelecionado].movimentacoes.push(novaMovimentacao);
    salvarDados();
    
    document.getElementById('form-movimentacao').reset();
    document.getElementById('parcelas').value = 1;
    
    atualizarInterface();
}

// Atualizar interface
function atualizarInterface() {
    if (!meses[mesSelecionado]) return;
    
    // Atualizar configuração
    document.getElementById('salario').value = meses[mesSelecionado].salario || 0;
    document.getElementById('outras-receitas').value = meses[mesSelecionado].outrasReceitas || 0;
    document.getElementById('saldo-anterior').value = meses[mesSelecionado].saldoAnterior || 0;
    calcularTotalReceitas();
    
    // Atualizar resumo
    atualizarResumo();
    
    // Atualizar tabela
    preencherTabelaMovimentacoesPaginada();
    
    // Atualizar análises
    atualizarAnalises();
    
    // Atualizar filtros
    configurarFiltros();
    
    // Atualizar parcelamentos futuros
    atualizarParcelamentosFuturos();
}

// Atualizar resumo financeiro
function atualizarResumo() {
    // Verificar se existem movimentações
    if (!meses[mesSelecionado] || !meses[mesSelecionado].movimentacoes) {
        document.getElementById('total-receitas-card').textContent = formatarMoeda(0);
        document.getElementById('total-gastos-card').textContent = formatarMoeda(0);
        document.getElementById('saldo-mes-card').textContent = formatarMoeda(0);
        document.getElementById('parcelas-pendentes').textContent = '0';
        return;
    }
    
    const movimentacoes = meses[mesSelecionado].movimentacoes;
    const salario = meses[mesSelecionado].salario || 0;
    const outrasReceitas = meses[mesSelecionado].outrasReceitas || 0;
    const saldoAnteriorMes = meses[mesSelecionado].saldoAnterior || 0;
    const receitas = movimentacoes.filter(m => m.tipo === 'receita').reduce((sum, m) => sum + m.valor, 0);
    const gastosOutrasPessoas = movimentacoes.filter(m => m.tipo === 'gasto' && m.pessoa !== 'Eduardo').reduce((sum, m) => sum + Math.abs(m.valor), 0);
    const totalReceitas = salario + outrasReceitas + receitas + saldoAnteriorMes + gastosOutrasPessoas;
    const gastos = movimentacoes.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + Math.abs(m.valor), 0);
    const saldo = totalReceitas - gastos;
    const parcelasPendentes = movimentacoes.filter(m => m.parcelas && m.parcelas.total > (m.parcelas.pagas || 1)).length;
    
    document.getElementById('total-receitas-card').textContent = formatarMoeda(totalReceitas);
    document.getElementById('total-gastos-card').textContent = formatarMoeda(gastos);
    document.getElementById('saldo-mes-card').textContent = formatarMoeda(saldo);
    document.getElementById('parcelas-pendentes').textContent = parcelasPendentes;
    
    // Destacar saldo negativo
    if (saldo < 0) {
        document.getElementById('saldo-mes-card').style.color = '#e74c3c';
    } else {
        document.getElementById('saldo-mes-card').style.color = '#2c3e50';
    }
}

// Excluir movimentação
function excluirMovimentacao(id) {
    if (confirm('Tem certeza que deseja excluir esta movimentação?')) {
        if (meses[mesSelecionado] && meses[mesSelecionado].movimentacoes) {
            meses[mesSelecionado].movimentacoes = meses[mesSelecionado].movimentacoes.filter(m => m.id != id);
            salvarDados();
            atualizarInterface();
        }
    }
}

// Atualizar análises
function atualizarAnalises() {
    atualizarGastosPorCategoria();
    atualizarGastosPorPessoa();
    atualizarGastosPorPagamento();
}

// Atualizar gastos por categoria
function atualizarGastosPorCategoria() {
    const elemento = document.getElementById('gastos-por-categoria');
    elemento.innerHTML = '';
    
    // Verificar se existem movimentações
    if (!meses[mesSelecionado] || !meses[mesSelecionado].movimentacoes) {
        return;
    }
    
    const movimentacoes = meses[mesSelecionado].movimentacoes;
    const gastos = movimentacoes.filter(m => m.tipo === 'gasto' && m.pessoa === 'Eduardo');
    const categorias = {};
    
    gastos.forEach(gasto => {
        if (!categorias[gasto.categoria]) {
            categorias[gasto.categoria] = 0;
        }
        categorias[gasto.categoria] += Math.abs(gasto.valor);
    });
    
    for (const categoria in categorias) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${categoria}</span> <span>${formatarMoeda(categorias[categoria])}</span>`;
        elemento.appendChild(li);
    }
}

// Atualizar gastos por pessoa
function atualizarGastosPorPessoa() {
    const elemento = document.getElementById('gastos-por-pessoa');
    elemento.innerHTML = '';
    
    // Verificar se existem movimentações
    if (!meses[mesSelecionado] || !meses[mesSelecionado].movimentacoes) {
        return;
    }
    
    const movimentacoes = meses[mesSelecionado].movimentacoes;
    const gastos = movimentacoes.filter(m => m.tipo === 'gasto');
    const pessoas = {};
    
    gastos.forEach(gasto => {
        if (!pessoas[gasto.pessoa]) {
            pessoas[gasto.pessoa] = 0;
        }
        pessoas[gasto.pessoa] += Math.abs(gasto.valor);
    });
    
    for (const pessoa in pessoas) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${pessoa}</span> <span>${formatarMoeda(pessoas[pessoa])}</span>`;
        elemento.appendChild(li);
    }
}

// Atualizar gastos por meio de pagamento
function atualizarGastosPorPagamento() {
    const elemento = document.getElementById('gastos-por-pagamento');
    elemento.innerHTML = '';
    
    // Verificar se existem movimentações
    if (!meses[mesSelecionado] || !meses[mesSelecionado].movimentacoes) {
        return;
    }
    
    const movimentacoes = meses[mesSelecionado].movimentacoes;
    const gastos = movimentacoes.filter(m => m.tipo === 'gasto' && m.pessoa === 'Eduardo');
    const gastosBradescoTotal = movimentacoes.filter(m => m.tipo === 'gasto' && m.meioPagamento === 'Bradesco').reduce((sum, m) => sum + Math.abs(m.valor), 0);
    const pagamentos = {};

    pagamentos['Bradesco TotaL'] = gastosBradescoTotal; // Adiciona o total de Bradesco diretamente
    
    gastos.forEach(gasto => {
        if (!pagamentos[gasto.meioPagamento]) {
            pagamentos[gasto.meioPagamento] = 0;
        }
        pagamentos[gasto.meioPagamento] += Math.abs(gasto.valor);
    });
    
    for (const pagamento in pagamentos) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${pagamento}</span> <span>${formatarMoeda(pagamentos[pagamento])}</span>`;
        elemento.appendChild(li);
    }
}

// Atualizar parcelamentos futuros
function atualizarParcelamentosFuturos() {
    const container = document.getElementById('parcelamentos-futuros');
    
    // Verificar se existem movimentações
    if (!meses[mesSelecionado] || !meses[mesSelecionado].movimentacoes) {
        container.innerHTML = '<p>Nenhum parcelamento futuro encontrado.</p>';
        return;
    }
    
    const movimentacoes = meses[mesSelecionado].movimentacoes;
    const parcelamentos = movimentacoes.filter(m => m.parcelas && m.parcelas.total > 1);
    var totalValorParcelamentos = 0;
    var totalValorParcelamentosEduardo = 0;
    
    if (parcelamentos.length === 0) {
        container.innerHTML = '<p>Nenhum parcelamento futuro encontrado.</p>';
        return;
    }
    
    let html = '<div class="parcelamento-info">';
    parcelamentos.forEach(p => {
        if (p.pessoa === 'Eduardo') {
            totalValorParcelamentosEduardo += Math.abs(p.valor);
        }
        totalValorParcelamentos += Math.abs(p.valor);
        const parcelasRestantes = p.parcelas.total - (p.parcelas.pagas || 1);
        if (parcelasRestantes > 0) {
            html += `
                <div class="parcelamento-item">
                    <span>${p.descricao}</span>
                    <span>${parcelasRestantes} parcela(s) restante(s)</span>
                    <span>${formatarMoeda(Math.abs(p.valor))} cada</span>
                </div>
            `;
        }
    });
    html += `<div class="parcelamento-total">Total Eduardo: ${formatarMoeda(totalValorParcelamentosEduardo)}</div>`;
    html += `<div class="parcelamento-total">Total: ${formatarMoeda(totalValorParcelamentos)}</div>`;
    html += '</div>';
    
    container.innerHTML = html;
}

// Configurar filtros
function configurarFiltros() {
    const categoriasFiltro = document.getElementById('filtro-categoria');
    const pessoasFiltro = document.getElementById('filtro-pessoa');
    const meioPagamentoFiltro = document.getElementById('filtro-meio-pagamento');
    
    // Limpar opções existentes (exceto a primeira)
    while (categoriasFiltro.options.length > 1) {
        categoriasFiltro.remove(1);
    }
    
    while (pessoasFiltro.options.length > 1) {
        pessoasFiltro.remove(1);
    }

    while (meioPagamentoFiltro.options.length > 1) {
        meioPagamentoFiltro.remove(1);
    }
    
    // Verificar se existem movimentações
    if (!meses[mesSelecionado] || !meses[mesSelecionado].movimentacoes) {
        return;
    }
    
    const movimentacoes = meses[mesSelecionado].movimentacoes;
    
    // Adicionar categorias únicas
    const categoriasUnicas = [...new Set(movimentacoes.map(m => m.categoria))];
    categoriasUnicas.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        categoriasFiltro.appendChild(option);
    });
    
    // Adicionar pessoas únicas
    const pessoasUnicas = [...new Set(movimentacoes.map(m => m.pessoa))];
    pessoasUnicas.forEach(pessoa => {
        const option = document.createElement('option');
        option.value = pessoa;
        option.textContent = pessoa;
        pessoasFiltro.appendChild(option);
    });

    const meiosPagamentoUnicos = [...new Set(movimentacoes.map(m => m.meioPagamento))];
    meiosPagamentoUnicos.forEach(meio => {
        const option = document.createElement('option');
        option.value = meio;
        option.textContent = meio;
        meioPagamentoFiltro.appendChild(option);
    });
}

// Filtrar movimentações
function filtrarMovimentacoes() {
    const descricaoFiltro = document.getElementById('filtro-descricao').value.toLowerCase();
    const tipoFiltro = document.getElementById('filtro-tipo').value;
    const categoriaFiltro = document.getElementById('filtro-categoria').value;
    const pessoaFiltro = document.getElementById('filtro-pessoa').value;
    const meioPagamentoFiltro = document.getElementById('filtro-meio-pagamento').value;
    
    const tbody = document.getElementById('tabela-movimentacoes').querySelector('tbody');
    const linhas = tbody.querySelectorAll('tr');

    var totalGastosFiltrados = 0;
    
    linhas.forEach(linha => {
        const descricao = linha.cells[3].textContent.toLowerCase();
        const tipo = linha.cells[1].textContent.toLowerCase();
        const categoria = linha.cells[6].textContent;
        const pessoa = linha.cells[5].textContent;
        
        const correspondeDescricao = descricao.includes(descricaoFiltro);
        const correspondeTipo = !tipoFiltro || (tipoFiltro === 'gasto' && tipo === 'gasto') || (tipoFiltro === 'receita' && tipo === 'receita');
        const correspondeCategoria = !categoriaFiltro || categoria === categoriaFiltro;
        const correspondePessoa = !pessoaFiltro || pessoa === pessoaFiltro;
        const correspondeMeioPagamento = !meioPagamentoFiltro || linha.cells[4].textContent === meioPagamentoFiltro;
        
        if (correspondeDescricao && correspondeTipo && correspondeCategoria && correspondePessoa && correspondeMeioPagamento) {
            linha.style.display = '';
        } else {
            linha.style.display = 'none';
        }
        // Calcular total de gastos filtrados
        if (linha.style.display !== 'none' && linha.cells[1].textContent.toLowerCase() === 'gasto') {
            totalGastosFiltrados += Math.abs(parseFloat(linha.cells[2].textContent.replace('R$', '').replace('.', '').replace(',', '.')));
        }
    });

    document.getElementById('total-gastos-footer').textContent = formatarMoeda(totalGastosFiltrados);
}

// Funções auxiliares
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Math.abs(valor));
}

function formatarData(data) {
    try {
        // Se a data já está no formato ISO (YYYY-MM-DD)
        if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [ano, mes, dia] = data.split('-');
            return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
        }
        
        // Para outros formatos, usa Date mas ajusta para o fuso horário local
        const dataObj = new Date(data);
        if (isNaN(dataObj.getTime())) {
            return data; // Retorna o valor original se não for uma data válida
        }
        
        // Ajusta para o fuso horário local adicionando o offset
        const offset = dataObj.getTimezoneOffset() * 60000;
        const dataLocal = new Date(dataObj.getTime() - offset);
        
        return dataLocal.toLocaleDateString('pt-BR');
    } catch (e) {
        console.error('Erro ao formatar data:', e);
        return data; // Retorna o valor original em caso de erro
    }
}

function formatarNomeMes(mes) {
    const [ano, mesNum] = mes.split('-');
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[parseInt(mesNum) - 1]} de ${ano}`;
}

// Função para paginar movimentações
function paginarMovimentacoes(movimentacoes, pagina, itensPorPagina) {
    const inicio = (pagina - 1) * itensPorPagina;
    return movimentacoes.slice(inicio, inicio + itensPorPagina);
}

// Atualizar tabela de movimentações com paginação
function preencherTabelaMovimentacoesPaginada() {
    const tbody = document.getElementById('tabela-movimentacoes').querySelector('tbody');
    tbody.innerHTML = '';

    if (!meses[mesSelecionado] || !meses[mesSelecionado].movimentacoes) {
        return;
    }

    const movimentacoes = meses[mesSelecionado].movimentacoes;
    // Corrige para pegar o valor atualizado do seletor
    const seletor = document.getElementById('itens-por-pagina-select');
    let itensPorPaginaAtual = itensPorPagina;
    if (seletor) {
        itensPorPaginaAtual = parseInt(seletor.value, 10) || itensPorPagina;
    }

    const movimentacoesPaginadas = paginarMovimentacoes(movimentacoes, paginaAtual, itensPorPaginaAtual);

    let totalGastos = 0;

    movimentacoesPaginadas.forEach(movimentacao => {
        if (movimentacao.tipo === 'gasto') {
            totalGastos += Math.abs(movimentacao.valor);
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatarData(movimentacao.data)}</td>
            <td>${movimentacao.tipo === 'receita' ? 'Receita' : 'Gasto'}</td>
            <td class="${movimentacao.tipo}">${formatarMoeda(movimentacao.valor)}</td>
            <td>${movimentacao.descricao}</td>
            <td>${movimentacao.meioPagamento}</td>
            <td>${movimentacao.pessoa}</td>
            <td>${movimentacao.categoria}</td>
            <td>${movimentacao.parcelas ? `${movimentacao.parcelas.atual}/${movimentacao.parcelas.total}` : 'À vista'}</td>
            <td>
                <button class="btn-excluir" data-id="${movimentacao.id}">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            excluirMovimentacao(id);
        });
    });

    document.getElementById('total-gastos-footer').textContent = formatarMoeda(totalGastos);

    atualizarPaginacao(movimentacoes.length);
}

// Função para atualizar controles de paginação (mostra só 3 botões de página por vez)
function atualizarPaginacao(totalItens) {
    const paginacaoContainer = document.getElementById('paginacao-container');
    paginacaoContainer.innerHTML = '';

    // Adiciona seletor de quantidade de itens por página
    let seletor = document.getElementById('itens-por-pagina-select');
    if (!seletor) {
        seletor = document.createElement('select');
        seletor.id = 'itens-por-pagina-select';
        [5, 10, 20, 50, 100].forEach(qtd => {
            const option = document.createElement('option');
            option.value = qtd;
            option.textContent = `${qtd} por página`;
            if (qtd === itensPorPagina) option.selected = true;
            seletor.appendChild(option);
        });
        seletor.addEventListener('change', function() {
            // Atualiza a variável global e recarrega a tabela
            window.itensPorPagina = parseInt(this.value, 10);
            paginaAtual = 1;
            //itensPorPagina = parseInt(this.value, 10);
            preencherTabelaMovimentacoesPaginada();
        });
    }
    paginacaoContainer.appendChild(seletor);

    // Usa o valor atualizado do seletor para calcular totalPaginas
    const itensPorPaginaAtual = parseInt(seletor.value, 10) || itensPorPagina;
    const totalPaginas = Math.ceil(totalItens / itensPorPaginaAtual);

    if (totalPaginas <= 1) return;

    const btnAnterior = document.createElement('button');
    btnAnterior.textContent = 'Anterior';
    btnAnterior.disabled = paginaAtual === 1;
    btnAnterior.addEventListener('click', () => {
        if (paginaAtual > 1) {
            paginaAtual--;
            preencherTabelaMovimentacoesPaginada();
        }
    });
    paginacaoContainer.appendChild(btnAnterior);

    // Lógica para mostrar só 3 botões de página
    let start = Math.max(1, paginaAtual - 1);
    let end = Math.min(totalPaginas, start + 2);

    // Ajusta o início se estiver no final
    if (end - start < 2) {
        start = Math.max(1, end - 2);
    }

    for (let i = start; i <= end; i++) {
        const btnPagina = document.createElement('button');
        btnPagina.textContent = i;
        btnPagina.className = i === paginaAtual ? 'pagina-ativa' : '';
        btnPagina.addEventListener('click', () => {
            paginaAtual = i;
            preencherTabelaMovimentacoesPaginada();
        });
        paginacaoContainer.appendChild(btnPagina);
    }

    const btnProximo = document.createElement('button');
    btnProximo.textContent = 'Próximo';
    btnProximo.disabled = paginaAtual === totalPaginas;
    btnProximo.addEventListener('click', () => {
        if (paginaAtual < totalPaginas) {
            paginaAtual++;
            preencherTabelaMovimentacoesPaginada();
        }
    });
    paginacaoContainer.appendChild(btnProximo);
}