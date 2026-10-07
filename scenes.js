/* QG do Abner — salas, cenários e grade curricular */
(function () {
  'use strict';
  const L = World.LOOKS;

  // cor = cabeçalho da janela da sala; ink = texto sobre ela
  const ROOMS = {
    hall: { nome: 'Saguão Central', curto: 'Saguão', num: '00', cor: '#4D7EA8', ink: '#FFFFFF', tag: 'Recepção', desc: 'O ponto de encontro de todas as salas.' },
    academia: { nome: 'Academia Psiquê', curto: 'Aula', num: '01', cor: '#2F8F7B', ink: '#FFFFFF', tag: 'Psicologia · 6º semestre', desc: 'A Profª Marcha dá aulas da sua grade com analogias, tabelas, gráficos e questionário no fim.' },
    lab: { nome: 'Laboratório Sinapse', curto: 'Neuroliga', num: '02', cor: '#3F5BD9', ink: '#FFFFFF', tag: 'Neuroliga · UFBA', desc: 'A Drª Ignição pesquisa com você para a Neuroliga e entrega o estudo em ABNT.' },
    agencia: { nome: 'Agência Propósito', curto: 'Agência', num: '03', cor: '#8A4FB0', ink: '#FFFFFF', tag: 'Psicologia · Política · Fé', desc: 'Cinco especialistas de marketing para conteúdo sobre psicologia, política e fé.' },
    fabrica: { nome: 'Fábrica de Faíscas', curto: 'Ideias', num: '04', cor: '#D69A00', ink: '#FFFFFF', tag: 'Nenhuma ideia é boba', desc: 'Toda ideia nova entra aqui, até a mais mirabolante. O Faísca avalia e monta o passo a passo.' },
    conta: { nome: 'Cartão Black', curto: 'Finanças', num: '05', cor: '#1C1C21', ink: '#F2C14E', tag: 'Finanças', desc: 'O Câmbio organiza entradas e saídas do mês, lê fotos de contas e gera o relatório em PDF.' },
    garagem: { nome: 'Garagem Nitro', curto: 'Descanso', num: '06', cor: '#D84315', ink: '#FFFFFF', tag: 'Hora de desligar', desc: 'Pilote o GTR, fuja da polícia e bata seu recorde.' },
    toca: { nome: 'Toca da Ratinha', curto: 'Ratinha', num: '07', cor: '#D9578A', ink: '#FFFFFF', tag: 'O cantinho dela', desc: 'O cantinho da Ratinha, com o contato dela sempre à mão.' },
    eclipse: { nome: 'Quarto Eclipse', curto: 'Dormir', num: '08', cor: '#3B4A8C', ink: '#FFFFFF', tag: 'Modo off', desc: 'Entrou, apagou: o QG fica offline até você sair do quarto.' }
  };
  const hallDoor = (side, a) => ({ side, a, to: 'hall', label: 'Saguão' });
  const SCENES = {
    hall: {
      id: 'hall', w: 12, h: 12, wall: '#4D6F94', floor: ['#A9B6C2', '#9AA8B5'], spawn: [6, 9],
      doors: [
        { side: 'L', a: 1, to: 'academia' }, { side: 'L', a: 4, to: 'lab' }, { side: 'L', a: 7, to: 'agencia' }, { side: 'L', a: 10, to: 'fabrica' },
        { side: 'R', a: 1, to: 'conta' }, { side: 'R', a: 4, to: 'garagem' }, { side: 'R', a: 7, to: 'toca' }, { side: 'R', a: 10, to: 'eclipse' }
      ],
      decor: [],
      furni: [
        { t: 'tapete', x: 3, y: 3, w: 6, d: 6, color: '#8E2F3C', border: '#E9B949', text: 'QG DO ABNER' },
        { t: 'recepcao', x: 5, y: 2, w: 3, d: 1 },
        { t: 'planta', x: 0, y: 0 }, { t: 'planta', x: 11, y: 11 }, { t: 'planta', x: 2, y: 2 }, { t: 'planta', x: 9, y: 2 },
        { t: 'sofa', x: 10, y: 4, w: 1, d: 1, color: '#2F6F9F' }, { t: 'sofa', x: 10, y: 6, w: 1, d: 1, color: '#2F6F9F' },
        { t: 'flores', x: 1, y: 11 }, { t: 'abajur', x: 11, y: 2 }
      ],
      npcs: []
    },
    academia: {
      id: 'academia', w: 8, h: 8, wall: '#3F7D6E', floor: ['#B98A5A', '#AC7D4E'], spawn: [1, 6],
      doors: [hallDoor('L', 6)],
      decor: [
        { t: 'lousa', side: 'R', a: 1.6, b: 6.4, z0: 34, z1: 102, text: 'PSICOLOGIA', text2: 'mente · comportamento · cuidado' },
        { t: 'janela', side: 'L', a: 1, b: 3.4, z0: 40, z1: 96 },
        { t: 'quadro', side: 'L', a: 4.1, b: 5.2, z0: 50, z1: 84, color: '#F4E3B2', text: 'Ψ', font: '700 22px serif', textColor: '#3F7D6E' }
      ],
      furni: [
        { t: 'tribuna', x: 5, y: 1 },
        { t: 'carteira', x: 2, y: 3 }, { t: 'carteira', x: 4, y: 3 }, { t: 'carteira', x: 6, y: 3 },
        { t: 'carteira', x: 2, y: 5 }, { t: 'carteira', x: 4, y: 5 }, { t: 'carteira', x: 6, y: 5 },
        { t: 'estante', x: 7, y: 0, w: 1, d: 1 }, { t: 'planta', x: 7, y: 7 }, { t: 'planta', x: 0, y: 0 }
      ],
      npcs: [{ id: 'marcha', name: 'Profª Marcha', look: L.marcha, x: 4, y: 1, dir: -1, talk: true }]
    },
    lab: {
      id: 'lab', w: 8, h: 8, wall: '#253A6B', floor: ['#D3DBE4', '#C5CED9'], spawn: [1, 5],
      doors: [hallDoor('L', 5)],
      decor: [
        { t: 'neuronio', side: 'R', a: 4.6, b: 7.2, z0: 40, z1: 100 },
        { t: 'eeg', side: 'L', a: 1.2, b: 3.8, z0: 44, z1: 96 },
        { t: 'texto', side: 'R', a: 4.6, b: 7.2, z: 108, text: 'NEUROLIGA', color: '#9FE8FF' }
      ],
      furni: [
        { t: 'bancada', x: 1, y: 0, w: 3, d: 1, micro: true },
        { t: 'cerebro', x: 4, y: 4 },
        { t: 'estante', x: 7, y: 2, w: 1, d: 1, r: 'L' },
        { t: 'mesa', x: 5, y: 6, w: 1, d: 1, pc: true, screen: '#7CF3FF' }, { t: 'cadeira', x: 6, y: 6 },
        { t: 'planta', x: 7, y: 7 }, { t: 'planta', x: 0, y: 0 }
      ],
      npcs: [{ id: 'ignicao', name: 'Drª Ignição', look: L.ignicao, x: 5, y: 3, dir: -1, talk: true }]
    },
    agencia: {
      id: 'agencia', w: 9, h: 8, wall: '#6E4790', floor: ['#C4CAD0', '#B7BEC5'], spawn: [1, 6],
      doors: [hallDoor('L', 6)],
      decor: [
        { t: 'texto', side: 'R', a: 1, b: 8, z: 106, text: 'PSICOLOGIA · POLÍTICA · FÉ', color: '#FFE08A', font: '700 12px "Silkscreen", monospace' },
        { t: 'post', side: 'R', a: 1, b: 3.4, z0: 30, z1: 84 },
        { t: 'quadro', side: 'R', a: 4.2, b: 6.2, z0: 40, z1: 84, color: '#FFFFFF', text: '4:5  9:16', textColor: '#6E4790' },
        { t: 'cruz', side: 'R', a: 7.1, z0: 52 },
        { t: 'janela', side: 'L', a: 1.2, b: 4, z0: 40, z1: 96 }
      ],
      furni: [
        { t: 'mesa', x: 1, y: 2, pc: true, caneca: true }, { t: 'mesa', x: 3, y: 2, pc: true, screen: '#FFB3E6' }, { t: 'mesa', x: 5, y: 2, pc: true, papel: true }, { t: 'mesa', x: 7, y: 2, pc: true, screen: '#B9F6CA' },
        { t: 'mesaReuniao', x: 4, y: 5, w: 2, d: 1 },
        { t: 'planta', x: 8, y: 7 }, { t: 'planta', x: 0, y: 0 }
      ],
      npcs: [
        { id: 'drift', name: 'Drift · Copy', look: L.drift, x: 1, y: 1, dir: 1, talk: true },
        { id: 'turbo', name: 'Turbo · Design', look: L.turbo, x: 3, y: 1, dir: 1, talk: true },
        { id: 'largada', name: 'Largada · Roteiro', look: L.largada, x: 5, y: 1, dir: -1, talk: true },
        { id: 'vacuo', name: 'Vácuo · Social', look: L.vacuo, x: 7, y: 1, dir: -1, talk: true },
        { id: 'pitstop', name: 'Pit Stop · Projetos', look: L.pitstop, x: 6, y: 5, dir: -1, talk: true }
      ]
    },
    fabrica: {
      id: 'fabrica', w: 7, h: 7, wall: '#C9971E', floor: ['#565C69', '#4D5361'], spawn: [1, 5],
      doors: [hallDoor('L', 5)],
      decor: [
        { t: 'post', side: 'R', a: 1, b: 4.6, z0: 30, z1: 88 },
        { t: 'janela', side: 'L', a: 1, b: 3.4, z0: 40, z1: 96 },
        { t: 'texto', side: 'R', a: 1, b: 4.6, z: 106, text: 'NENHUMA IDEIA É BOBA', color: '#3A2A00' }
      ],
      furni: [
        { t: 'ideia', x: 3, y: 3, act: 'ideia' },
        { t: 'mesa', x: 5, y: 1, pc: true, screen: '#FFE27A' },
        { t: 'caixas', x: 6, y: 5 }, { t: 'planta', x: 6, y: 6 }, { t: 'cadeira', x: 5, y: 2, color: '#E0A800' }
      ],
      npcs: [{ id: 'faisca', name: 'Faísca', look: L.faisca, x: 4, y: 2, dir: -1, talk: true }]
    },
    conta: {
      id: 'conta', w: 7, h: 7, wall: '#1E1E24', floor: ['#2E2E35', '#27272D'], spawn: [1, 5],
      doors: [hallDoor('L', 5)],
      decor: [
        { t: 'grafico', side: 'R', a: 1, b: 3.4, z0: 40, z1: 96 },
        { t: 'quadro', side: 'R', a: 3.9, b: 6.3, z0: 44, z1: 92, color: '#111114', frame: '#E9B949', text: 'BLACK', font: '700 16px "Pixelify Sans", monospace', textColor: '#E9B949' },
        { t: 'quadro', side: 'L', a: 1.2, b: 3.2, z0: 52, z1: 86, color: '#F5EFD8', frame: '#E9B949', text: 'Mt 25:21', font: '700 10px "Silkscreen", monospace', textColor: '#1E1E24' }
      ],
      furni: [
        { t: 'tapete', x: 1, y: 2, w: 4, d: 3, color: '#111114', border: '#E9B949' },
        { t: 'cofre', x: 6, y: 0, act: 'cofre' },
        { t: 'mesa', x: 2, y: 2, w: 2, d: 1, pc: true, screen: '#F2C14E', papel: true, color: '#3A3A42' },
        { t: 'estante', x: 0, y: 3, w: 1, d: 1, r: 'L', color: '#2A2A30' },
        { t: 'planta', x: 6, y: 6 }, { t: 'planta', x: 0, y: 0 }
      ],
      npcs: [{ id: 'cambio', name: 'Câmbio', look: L.cambio, x: 3, y: 1, dir: 1, talk: true }]
    },
    garagem: {
      id: 'garagem', w: 9, h: 7, wall: '#2A2B33', floor: ['#6E7176', '#666A70'], spawn: [1, 5],
      doors: [hallDoor('L', 5)],
      decor: [
        { t: 'portao', side: 'R', a: 1, b: 4.6, z1: 90 },
        { t: 'neon', side: 'R', a: 5, b: 8.6, z: 80, text: 'NITRO', color: '#29E6FF' },
        { t: 'neon', side: 'L', a: 1, b: 4, z: 84, text: 'FUGA', color: '#FF3D8B' }
      ],
      furni: [
        { t: 'carro', x: 3, y: 2, w: 2, d: 1, act: 'jogo' },
        { t: 'arcade', x: 8, y: 0, act: 'jogo' },
        { t: 'pneus', x: 8, y: 5 }, { t: 'pneus', x: 0, y: 0 },
        { t: 'cone', x: 6, y: 4 }, { t: 'cone', x: 2, y: 5 },
        { t: 'ferramentas', x: 6, y: 0 }
      ],
      npcs: []
    },
    toca: {
      id: 'toca', w: 7, h: 7, wall: '#D9799E', floor: ['#C99A7A', '#BE8F6F'], spawn: [1, 5],
      doors: [hallDoor('L', 5)],
      decor: [
        { t: 'coracaoQuadro', side: 'R', a: 2.2, b: 4.4, z0: 40, z1: 96, text: 'ABNER + RATINHA' },
        { t: 'janela', side: 'R', a: 5, b: 6.6, z0: 40, z1: 96 },
        { t: 'janela', side: 'L', a: 1.2, b: 3.4, z0: 40, z1: 96 }
      ],
      furni: [
        { t: 'tapete', x: 2, y: 2, w: 3, d: 3, color: '#F3B5CB', border: '#FFFFFF' },
        { t: 'sofa', x: 1, y: 0, w: 2, d: 1, color: '#B8325F' },
        { t: 'flores', x: 6, y: 0 }, { t: 'telefone', x: 5, y: 5, act: 'telefone' },
        { t: 'coracao', x: 4, y: 2, color: '#FF4F79' }, { t: 'coracao', x: 1, y: 3, size: 2, color: '#FF8FB1' },
        { t: 'planta', x: 6, y: 6 }
      ],
      npcs: [{ id: 'ratinha', name: 'Ratinha', look: L.ratinha, x: 3, y: 3, dir: -1, talk: true }]
    },
    eclipse: {
      id: 'eclipse', w: 6, h: 6, wall: '#26305A', floor: ['#4B3F63', '#44395B'], spawn: [1, 4], night: true,
      doors: [hallDoor('L', 4)],
      decor: [{ t: 'janela', side: 'R', a: 2.6, b: 4.6, z0: 40, z1: 96, lua: true }],
      furni: [
        { t: 'cama', x: 1, y: 0, w: 1, d: 2, color: '#3B4A8C' },
        { t: 'abajur', x: 0, y: 0, lit: false }, { t: 'tapete', x: 2, y: 3, w: 2, d: 2, color: '#2E3970', border: '#5C6BC0' },
        { t: 'planta', x: 5, y: 5 }
      ],
      npcs: []
    }
  };
  // rótulos e cores das portas do saguão
  SCENES.hall.doors.forEach(d => { const r = ROOMS[d.to]; d.label = r.nome; d.color = r.cor; });

  const GRADE = {
    '1': ['Bioestatística', 'Desenvolvimento Pessoal e Trabalhabilidade', 'Desenvolvimento Sustentável e Direitos Individuais', 'Psicologia: Ciência, Ética e Mercado de Trabalho', 'Saúde Coletiva', 'Teoria e Sistemas'],
    '2': ['Atividades Práticas Interdisciplinares de Extensão I', 'Diversidade da Personalidade Humana', 'Inteligência Artificial Aplicada', 'Neurociência e Genética Comportamental', 'Processos Psicológicos Contemporâneos', 'Psicologia Social', 'Psicologia Social e Dinâmicas Culturais'],
    '3': ['Atividades Práticas Interdisciplinares de Extensão II', 'Desenvolvimento Humano I: Infância e Adolescência', 'Metodologia da Pesquisa', 'Neuroanatomia Funcional e Psicobiologia', 'Neuropsicologia', 'Psicanálise e Abordagens Dinâmicas', 'Psicologia Experimental e Ciência do Comportamento'],
    '4': ['Atividades Práticas Interdisciplinares de Extensão III', 'Avaliação e Diagnóstico Psicológico', 'Desenvolvimento Humano II: Adultez, Velhice e Psicogerontologia', 'Estágio Supervisionado Básico I (Observação do Comportamento)', 'Métodos Aplicados de Pesquisa em Psicologia', 'Psicologia Educacional: Inclusão e Aprendizagem', 'Psicologia Existencial, Fenomenologia e Sentido da Vida'],
    '5': ['Atividades Práticas Interdisciplinares de Extensão IV', 'Avaliação Psicológica Avançada: Entrevistas e Testes', 'Empreendedorismo', 'Estágio Supervisionado Básico II (Avaliação Psicológica)', 'Intervenções Psicológicas em TEA e Deficiências', 'Psicologia Positiva e da Felicidade', 'Psicologia, Ética e Responsabilidade Social', 'Psicopatologias Contemporâneas e Saúde Mental Digital I', 'Técnicas de Grupo e Relações Humanas'],
    '6': ['Psicanálise: Técnicas e Práticas Modernas', 'Psicologia Organizacional, do Trabalho e Inovações', 'Psicopatologias Contemporâneas e Saúde Mental Digital II', 'Psicoterapia Infantil e Neurodiversidade', 'Temas Contemporâneos em Psicologia Escolar', 'Estágio Supervisionado Básico III (Psicossocial)', 'Atividades Práticas Interdisciplinares de Extensão V'],
    '7': ['Estágio Supervisionado Básico IV (Clínica)', 'Psicofarmacologia Integrada', 'Psicologia Cognitivo-Comportamental', 'Psicologia do Esporte e Gestão de Alta Performance', 'Psicologia Hospitalar e Saúde Integrada', 'Psicologia Jurídica e Forense', 'Psicoterapia Humanista e Fenomenológica-Existencial'],
    '8': ['Aconselhamento Psicológico', 'Contemporaneidade e Relações Familiares', 'Estágio Supervisionado Específico I (Ênfase Clínica)', 'Orientação Profissional e Carreira', 'Psicologia e Processos Clínicos', 'Psicomotricidade, Corpo e Saúde'],
    '9': ['Estágio Supervisionado Específico II (Ênfase Clínica)', 'Psicodiagnóstico Integrado', 'Psicossomática', 'Trabalho de Conclusão de Curso I'],
    '10': ['Estágio Supervisionado Específico III (Ênfase Clínica)', 'Psicologia das Emergências e Crise', 'Tópicos Integradores', 'Trabalho de Conclusão de Curso II'],
    'opt': ['Língua Brasileira de Sinais (Libras)']
  };

  const AGENTS = {
    marcha: { nome: 'Profª Marcha', papel: 'Professora', pede: 'O que você quer aprender hoje?' },
    ignicao: { nome: 'Drª Ignição', papel: 'Pesquisadora', pede: 'Qual pergunta vamos investigar?' },
    drift: { nome: 'Drift', papel: 'Copywriter', pede: 'O que você quer comunicar?' },
    turbo: { nome: 'Turbo', papel: 'Designer', pede: 'Qual o assunto dos cards?' },
    largada: { nome: 'Largada', papel: 'Roteirista', pede: 'Qual o tema do vídeo?' },
    vacuo: { nome: 'Vácuo', papel: 'Social media', pede: 'Qual o objetivo do perfil agora?' },
    pitstop: { nome: 'Pit Stop', papel: 'Projetos', pede: 'Que projeto você imagina lançar?' },
    faisca: { nome: 'Faísca', papel: 'Inventor', pede: 'Solta a ideia, até a mais doida!' },
    cambio: { nome: 'Câmbio', papel: 'Finanças', pede: 'Diga um gasto. Ex.: "gastei 32 no almoço"' },
    ratinha: { nome: 'Ratinha', papel: 'Namorada', pede: 'Escreve um recadinho pra ela…' }
  };
  window.QGData = { ROOMS, SCENES, GRADE, AGENTS, LOOKS: L };
})();
