// Variáveis globais
let chartModules = null;
let chartStates = null;
let chartResponsibles = null;

// Dados de referência para o total de municípios por estado
const totalMunicipiosPorEstado = {
  'PE': 185,
  'AL': 102
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM carregado, inicializando aplicação...');
  
  // Inicializar Select2 para comboboxes pesquisáveis
  initializeSelect2();
  
  // Adicionar event listeners
  setupEventListeners();
  
  // Inicializar contagem de resultados
  updateResultCount();
});

// Inicializar Select2
function initializeSelect2() {
  // Certifique-se de que jQuery e Select2 estão disponíveis
  if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
    jQuery('.filter-select').select2({
      placeholder: "Selecione uma opção",
      allowClear: true
    });
    
    // Adicionar event listener para o evento select2:select e select2:clear
    jQuery('.filter-select').on('select2:select select2:clear', function(e) {
      filterTable();
    });
  } else {
    console.warn('jQuery or Select2 not found. Ensure they are properly loaded.');
  }
}

// Configurar event listeners
function setupEventListeners() {
  console.log('Configurando event listeners...');
  
  // Event listener para pesquisa geral
  const generalSearchInput = document.getElementById('generalSearch');
  if (generalSearchInput) generalSearchInput.addEventListener('input', filterTable);
  
  // Event listeners para o painel de dashboard
  const showDashboardBtn = document.getElementById('showDashboardBtn');
  const closeDashboardBtn = document.getElementById('closeDashboardBtn');
  
  if (showDashboardBtn) showDashboardBtn.addEventListener('click', showDashboard);
  if (closeDashboardBtn) closeDashboardBtn.addEventListener('click', hideDashboard);
  
  // Event listener para o botão de exportar PDF
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPdf);
}

// Filtrar tabela com base nos critérios selecionados
function filterTable() {
  console.log('Aplicando filtros...');
  
  // Obter valores dos filtros
  const municipioValue = jQuery('#municipio').val() || '';
  const moduloValue = jQuery('#modulo').val() || '';
  const responsavelValue = jQuery('#responsavel').val() || '';
  const searchValue = document.getElementById('generalSearch').value.toUpperCase();
  
  console.log('Filtros selecionados:', { 
    municipio: municipioValue, 
    modulo: moduloValue, 
    responsavel: responsavelValue, 
    search: searchValue 
  });
  
  const tbody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
  const rows = tbody.getElementsByTagName('tr');
  
  let visibleCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const columns = rows[i].getElementsByTagName('td');
    if (columns.length === 0) continue;
    
    const municipio = columns[0].textContent.trim();
    const responsavel = columns[1].textContent.trim();
    
    // Extrair o texto do módulo sem as tags HTML
    let moduloElement = columns[2].querySelector('.badge');
    let modulo = moduloElement ? moduloElement.textContent.trim() : columns[2].textContent.trim();
    
    // Verificar se a linha corresponde a todos os filtros
    const matchesMunicipio = !municipioValue || municipio === municipioValue;
    const matchesModulo = !moduloValue || modulo === moduloValue;
    const matchesResponsavel = !responsavelValue || responsavel === responsavelValue;
    
    // Verificar pesquisa geral
    let matchesSearch = true;
    if (searchValue) {
      const rowText = (municipio + ' ' + responsavel + ' ' + modulo).toUpperCase();
      matchesSearch = rowText.includes(searchValue);
    }
    
    if (matchesMunicipio && matchesModulo && matchesResponsavel && matchesSearch) {
      rows[i].style.display = '';
      visibleCount++;
    } else {
      rows[i].style.display = 'none';
    }
  }
  
  console.log(`Filtros aplicados: ${visibleCount} registros visíveis`);
  
  // Atualizar contador de resultados
  updateResultCount(visibleCount);
  
  // Atualizar gráficos se o painel estiver visível
  updateCharts(); // sempre atualiza os dados dos gráficos, mesmo que invisíveis
}

// Atualizar contador de resultados
function updateResultCount(count) {
  const resultCountElement = document.getElementById('resultCount');
  if (!count && count !== 0) {
    // Contar linhas visíveis se o count não for fornecido
    const tbody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
    const rows = tbody.getElementsByTagName('tr');
    count = Array.from(rows).filter(row => row.style.display !== 'none').length;
  }
  resultCountElement.textContent = count;
}

// Mostrar painel de dashboard
function showDashboard() {
  console.log('Mostrando painel de dashboard');
  
  const dashboardPanel = document.getElementById('dashboardPanel');
  dashboardPanel.classList.add('active');
  
  // Atualizar gráficos após um pequeno atraso para garantir que o painel esteja visível
  setTimeout(() => {
    updateCharts();
  }, 100);
}

// Esconder painel de dashboard
function hideDashboard() {
  console.log('Escondendo painel de dashboard');
  
  const dashboardPanel = document.getElementById('dashboardPanel');
  dashboardPanel.classList.remove('active');
}

// Atualizar gráficos com base nos dados filtrados
function updateCharts() {
  console.log('Atualizando gráficos...');
  
  // Obter dados visíveis
  const tbody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
  const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.style.display !== 'none');
  
  if (rows.length === 0) {
    console.warn('Nenhum dado visível para gerar gráficos');
    return;
  }
  
  // Dados para gráficos
  const moduleData = {};
  const municipiosPorEstado = { 'PE': new Set(), 'AL': new Set() };
  const responsibleData = {};
  
  // Processar dados
  rows.forEach(row => {
    const columns = row.querySelectorAll('td');
    if (columns.length === 0) return; // Pular cabeçalhos
    
    const municipio = columns[0].textContent.trim();
    const responsavel = columns[1].textContent.trim();
    
    // Extrair o texto do módulo sem as tags HTML
    let moduloElement = columns[2].querySelector('.badge');
    let modulo = moduloElement ? moduloElement.textContent.trim() : columns[2].textContent.trim();
    
    // Contar módulos
    if (modulo in moduleData) {
      moduleData[modulo]++;
    } else {
      moduleData[modulo] = 1;
    }
    
    // Contar municípios únicos por estado
    if (municipio.includes('- PE')) {
      municipiosPorEstado['PE'].add(municipio);
    } else if (municipio.includes('- AL')) {
      municipiosPorEstado['AL'].add(municipio);
    }
    
    // Contar responsáveis
    if (responsavel in responsibleData) {
      responsibleData[responsavel]++;
    } else {
      responsibleData[responsavel] = 1;
    }
  });
  
  // Converter Sets para contagens
  const stateData = {
    'PE': municipiosPorEstado['PE'].size,
    'AL': municipiosPorEstado['AL'].size
  };
  
  console.log('Dados processados:', { moduleData, stateData, responsibleData });
  
  // Renderizar gráficos
  renderModulesChart(moduleData);
  renderStatesChart(stateData);
  renderResponsiblesChart(responsibleData);
}

// Renderizar gráfico de módulos
function renderModulesChart(data) {
  console.log('Renderizando gráfico de módulos:', data);
  
  const ctx = document.getElementById('modulesChart');
  if (!ctx) {
    console.error('Elemento canvas para gráfico de módulos não encontrado');
    return;
  }
  
  // Destruir gráfico existente se houver
  if (chartModules) {
    chartModules.destroy();
  }
  
  // Cores para os módulos
  const colors = {
    'Portal da Transparência': 'rgba(0, 151, 178, 0.7)',
    'Tributos': 'rgba(16, 185, 129, 0.7)',
    'Protocolo': 'rgba(245, 158, 11, 0.7)',
    'Contabilidade': 'rgba(239, 68, 68, 0.7)',
    'Frota': 'rgba(6, 182, 212, 0.7)',
    'Logística': 'rgba(139, 92, 246, 0.7)',
    'Recursos Humanos': 'rgba(236, 72, 153, 0.7)'
  };
  
  // Ordenar dados do maior para o menor
  const sortedData = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  
  // Extrair labels e dados
  const labels = Object.keys(sortedData);
  const values = Object.values(sortedData);
  
  if (labels.length === 0 || values.length === 0) {
    console.warn('Dados insuficientes para renderizar o gráfico de módulos');
    return;
  }
  
  const backgroundColors = labels.map(label => {
    return colors[label] || 'rgba(100, 116, 139, 0.7)';
  });
  
  // Criar gráfico
  chartModules = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors,
        borderColor: 'white',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false // Remover a legenda conforme solicitado
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Renderizar gráfico de estados
function renderStatesChart(data) {
  console.log('Renderizando gráfico de estados:', data);
  
  const ctx = document.getElementById('statesChart');
  if (!ctx) {
    console.error('Elemento canvas para gráfico de estados não encontrado');
    return;
  }
  
  // Destruir gráfico existente se houver
  if (chartStates) {
    chartStates.destroy();
  }
  
  // Extrair labels e dados
  const labels = Object.keys(data);
  const values = Object.values(data);
  
  if (labels.length === 0 || values.length === 0) {
    console.warn('Dados insuficientes para renderizar o gráfico de estados');
    return;
  }
  
  // Criar gráfico
  chartStates = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Municípios Atendidos',
        data: values,
        backgroundColor: 'rgba(0, 151, 178, 0.7)',
        borderColor: 'rgba(0, 151, 178, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          display: false // Remover a legenda conforme solicitado
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const state = context.label;
              const value = context.raw;
              const total = totalMunicipiosPorEstado[state];
              const percentage = (value / total * 100).toFixed(1);
              return `Municípios: ${value} de ${total} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Renderizar gráfico de responsáveis
function renderResponsiblesChart(data) {
  console.log('Renderizando gráfico de responsáveis:', data);
  
  const ctx = document.getElementById('responsiblesChart');
  if (!ctx) {
    console.error('Elemento canvas para gráfico de responsáveis não encontrado');
    return;
  }
  
  // Destruir gráfico existente se houver
  if (chartResponsibles) {
    chartResponsibles.destroy();
  }
  
  // Ordenar responsáveis por quantidade (decrescente)
  const sortedData = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  
  // Extrair labels e dados
  const labels = Object.keys(sortedData);
  const values = Object.values(sortedData);
  
  if (labels.length === 0 || values.length === 0) {
    console.warn('Dados insuficientes para renderizar o gráfico de responsáveis');
    return;
  }
  
  // Gerar cores
  const generateColors = (count) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360 / count) % 360;
      colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
    }
    return colors;
  };
  
  const backgroundColors = generateColors(labels.length);
  
  // Criar gráfico
chartResponsibles = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: labels,
    datasets: [{
      label: 'Módulos por Municípios Atendidos',
      data: values,
      backgroundColor: backgroundColors,
      borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
      borderWidth: 1
    }]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false, // ⛳ importante!
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10
      }
    }
  }
});

// ✅ Ajuste final na altura baseado na quantidade de labels
const alturaPorResponsavel = 35;
const alturaTotal = labels.length * alturaPorResponsavel;
ctx.parentNode.style.height = `${alturaTotal}px`; // aumenta altura do container do canvas

}

// Garantir que os gráficos estão gerados mesmo que o painel não esteja visível
if (!chartModules || !chartStates || !chartResponsibles) {
  updateCharts();
}