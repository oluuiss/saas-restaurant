// Idiomas suportados pelos sites dos restaurantes e textos fixos do template.
// Os textos editáveis (títulos, pratos, etc.) ficam no documento do site como { pt, en, de }.

export const LANGUAGES = [
  { code: 'pt', locale: 'pt-BR', country: 'BR', name: 'Português' },
  { code: 'en', locale: 'en-US', country: 'US', name: 'English' },
  { code: 'de', locale: 'de-DE', country: 'DE', name: 'Deutsch' },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export const languageMeta = (code) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

/** Idiomas ativos do site, com o padrão sempre em primeiro. */
export const orderedLanguages = (site) =>
  LANGUAGES.filter((l) => site.languages.includes(l.code)).sort((a, b) => (a.code === site.defaultLanguage ? -1 : b.code === site.defaultLanguage ? 1 : 0));

/** Lê um texto traduzível: idioma pedido → idioma padrão → qualquer idioma preenchido. */
export function tr(field, lang, fallback = 'pt') {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  if (field[lang]) return field[lang];
  if (field[fallback]) return field[fallback];
  return LANGUAGE_CODES.map((c) => field[c]).find(Boolean) ?? '';
}

export const isTranslatable = (value) =>
  value != null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0 &&
  Object.keys(value).every((k) => LANGUAGE_CODES.includes(k));

/** Textos fixos do template. */
export const UI = {
  pt: {
    nav: { home: 'Início', menu: 'Cardápio', about: 'A casa', locations: 'Unidades', reserve: 'Reservar mesa', open: 'Abrir menu', close: 'Fechar menu', language: 'Idioma', signIn: 'Entrar', account: 'Minha conta', signOut: 'Sair', cart: 'Carrinho', promos: 'Promoções' },
    menu: { all: 'Todos', featured: 'Favorito da casa', soldOut: 'Esgotado', empty: 'Nenhum prato nesta categoria ainda.', add: 'Adicionar {name}', added: '{name} no carrinho' },
    promos: { eyebrow: 'Promoções', title: 'Aproveite enquanto dura', coupon: 'Cupom', copy: 'Copiar', copied: 'Cupom copiado!', until: 'Até {date}', all: 'Em todo o cardápio', items: 'Em pratos selecionados', reservation: 'Na reserva antecipada', auto: 'Desconto automático', advance: 'Reservando com {hours}h de antecedência' },
    visit: { eyebrow: 'Visite a gente', title: 'Horários e contato', hours: 'Horário de funcionamento', closed: 'Fechado', contact: 'Fale com a gente', phone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail', instagram: 'Instagram', delivery: 'Pedir delivery', deliveryMessage: 'Olá! Quero fazer um pedido.', today: 'Hoje' },
    locations: { directions: 'Como chegar', call: 'Ligar' },
    reserve: {
      date: 'Data', time: 'Horário', party: 'Pessoas', floorPlan: 'Mapa do salão', floorPlanHint: 'Toque em uma mesa disponível para selecioná-la.',
      legend: { available: 'Disponível', selected: 'Selecionada', occupied: 'Ocupada', unsuitable: 'Tamanho diferente' },
      yourReservation: 'Sua reserva', selectTable: 'Selecione uma mesa no mapa', table: 'Mesa', name: 'Seu nome', phone: 'Seu telefone',
      confirm: 'Confirmar reserva', confirming: 'Confirmando…', login: 'Entrar para reservar', successTitle: 'Reserva confirmada!',
      successText: 'Mesa {table} para {guests} em {date} às {time}.', code: 'Código', another: 'Fazer outra reserva', mine: 'Ver minhas reservas',
      noSlots: 'Não há horários disponíveis neste dia.', noneAvailable: 'Nenhuma mesa disponível nesse horário. Tente outro horário.',
      largeParty: 'Para grupos com mais de {max} pessoas, fale direto com o restaurante.', unavailable: 'As reservas online ainda não estão disponíveis.',
      error: 'Não foi possível concluir a reserva. Tente novamente.', taken: 'Essa mesa acabou de ser reservada. Escolha outra.', loading: 'Carregando mesas…',
      promo: 'Sua reserva ganhou “{title}”. Mostre o cupom {code} no restaurante.', policy: 'Cancelamento grátis até 2h antes. Cada cancelamento reduz 1 ponto da sua nota.',
    },
    table: {
      cta: 'Estou no restaurante', title: 'Em qual mesa você está?', hint: 'O número está na plaquinha da mesa.', label: 'Número da mesa', check: 'Continuar',
      notFound: 'Não encontramos essa mesa. Confira o número.', welcome: 'Mesa {table}', choose: 'Como podemos ajudar?', call: 'Chamar um atendente',
      callText: 'Alguém da equipe vem até a sua mesa.', order: 'Pedir pelo cardápio', orderText: 'Escolha aqui e entregamos na sua mesa.',
      called: 'Pronto! Um atendente já está a caminho.', banner: 'Mesa {table} · seus pedidos vão direto para a mesa', leave: 'Sair da mesa', callAgain: 'Chamar atendente',
    },
    cart: {
      title: 'Seu pedido', empty: 'Seu carrinho está vazio.', emptyHint: 'Escolha seus pratos no cardápio.', subtotal: 'Subtotal', discount: 'Desconto', delivery: 'Entrega', free: 'Grátis', total: 'Total',
      coupon: 'Cupom de desconto', apply: 'Aplicar', couponInvalid: 'Cupom inválido ou fora da validade.', couponApplied: 'Cupom {code} aplicado', couponNotBest: 'Você já tem uma promoção melhor aplicada.',
      minOrder: 'Pedido mínimo para entrega: {amount}', next: 'Continuar', place: 'Fazer pedido · {amount}', placing: 'Enviando pedido…', remove: 'Remover', decrease: 'Diminuir', increase: 'Aumentar',
      deliveryTitle: 'Entrega', tableTitle: 'Pedido na mesa {table}', street: 'Rua e número', complement: 'Complemento', district: 'Bairro', city: 'Cidade', reference: 'Ponto de referência',
      notes: 'Observações', notesPlaceholder: 'Ex.: sem cebola, troco para R$ 100', payment: 'Pagamento', payOnDelivery: 'Pagar na entrega', payOnDeliveryText: 'Dinheiro, cartão ou Pix na hora.',
      payAtTable: 'Pagar na mesa', payAtTableText: 'Você acerta a conta com a equipe.', payOnline: 'Cartão online', payOnlineText: 'Ambiente de teste: use 4242 4242 4242 4242.',
      cardNumber: 'Número do cartão', expiry: 'Validade (MM/AA)', cvc: 'CVV', holder: 'Nome no cartão', estimate: 'Entrega em {min}–{max} min',
      deliveryOff: 'O delivery não está disponível agora.', successTitle: 'Pedido enviado!', successText: 'Pedido #{number}. Acompanhe o andamento em Minha conta.',
      successTable: 'Pedido #{number}. Já vamos levar até a sua mesa.', view: 'Acompanhar pedido', continue: 'Voltar ao cardápio', loginToOrder: 'Entre para pedir delivery', back: 'Voltar',
      error: 'Não foi possível enviar o pedido. Tente novamente.',
    },
    orders: {
      status: { received: 'Recebido', preparing: 'Em preparo', out_for_delivery: 'Saiu para entrega', ready: 'Pronto', delivered: 'Entregue', canceled: 'Cancelado' },
      delivery: 'Delivery', table: 'Mesa {table}', number: 'Pedido #{number}', cancel: 'Cancelar pedido', cancelConfirm: 'Cancelar este pedido? Sua nota cai 1 ponto.',
    },
    auth: {
      login: 'Entrar', register: 'Criar conta', name: 'Nome', email: 'E-mail', phone: 'Celular', password: 'Senha', passwordHint: 'Mínimo de 8 caracteres',
      toRegister: 'Ainda não tem conta? Criar conta', toLogin: 'Já tem conta? Entrar', subtitle: 'Acompanhe suas reservas e pedidos no {name}.', required: 'Entre ou crie sua conta para continuar.',
      wrong: 'E-mail ou senha incorretos.', error: 'Confira os dados e tente novamente.', close: 'Fechar',
    },
    account: {
      title: 'Minha conta', hello: 'Olá, {name}!', score: 'Sua nota', scoreHint: 'A nota sobe quando você comparece às reservas e recebe seus pedidos. Cada cancelamento tira 1 ponto.',
      reservations: 'Minhas reservas', orders: 'Meus pedidos', none: 'Nada por aqui ainda.', cancel: 'Cancelar reserva', cancelConfirm: 'Cancelar esta reserva? Sua nota cai 1 ponto.',
      cannotCancel: 'Não é mais possível cancelar', cancelUntil: 'Pode cancelar até {time}', back: 'Voltar ao site', signOut: 'Sair da conta',
      status: { confirmed: 'Confirmada', canceled: 'Cancelada', attended: 'Compareceu', no_show: 'Não compareceu' },
      policy: 'Cancelamento até 2h antes. Reservas feitas em cima da hora podem ser canceladas em até 30 min, desde que faltem mais de 30 min.',
    },
    common: { guests: { one: '{count} pessoa', other: '{count} pessoas' }, seats: { one: '{count} lugar', other: '{count} lugares' }, items: { one: '{count} item', other: '{count} itens' } },
    footer: { navigate: 'Navegue', madeWith: 'Site feito com', rights: '© {year} {name}. Todos os direitos reservados.' },
    areas: { kitchen: 'Cozinha', bathroom: 'Banheiro', bar: 'Bar', entrance: 'Entrada', stairs: 'Escada', cashier: 'Caixa', wall: '', window: 'Janela', plant: '', zone: 'Área' },
    notFound: { title: 'Site não encontrado', text: 'Esse restaurante ainda não publicou o site ou o endereço está errado.' },
  },
  en: {
    nav: { home: 'Home', menu: 'Menu', about: 'About', locations: 'Locations', reserve: 'Book a table', open: 'Open menu', close: 'Close menu', language: 'Language', signIn: 'Sign in', account: 'My account', signOut: 'Sign out', cart: 'Cart', promos: 'Deals' },
    menu: { all: 'All', featured: 'House favorite', soldOut: 'Sold out', empty: 'No dishes in this category yet.', add: 'Add {name}', added: '{name} added to cart' },
    promos: { eyebrow: 'Deals', title: 'Enjoy them while they last', coupon: 'Coupon', copy: 'Copy', copied: 'Coupon copied!', until: 'Until {date}', all: 'On the whole menu', items: 'On selected dishes', reservation: 'When you book ahead', auto: 'Automatic discount', advance: 'Booking {hours}h in advance' },
    visit: { eyebrow: 'Visit us', title: 'Hours & contact', hours: 'Opening hours', closed: 'Closed', contact: 'Get in touch', phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email', instagram: 'Instagram', delivery: 'Order delivery', deliveryMessage: 'Hi! I would like to place an order.', today: 'Today' },
    locations: { directions: 'Get directions', call: 'Call' },
    reserve: {
      date: 'Date', time: 'Time', party: 'Guests', floorPlan: 'Floor plan', floorPlanHint: 'Tap an available table to select it.',
      legend: { available: 'Available', selected: 'Selected', occupied: 'Taken', unsuitable: 'Different size' },
      yourReservation: 'Your reservation', selectTable: 'Pick a table on the map', table: 'Table', name: 'Your name', phone: 'Your phone',
      confirm: 'Confirm reservation', confirming: 'Confirming…', login: 'Sign in to book', successTitle: 'Reservation confirmed!',
      successText: 'Table {table} for {guests} on {date} at {time}.', code: 'Code', another: 'Make another reservation', mine: 'See my reservations',
      noSlots: 'No times available on this day.', noneAvailable: 'No tables available at this time. Try another time.',
      largeParty: 'For groups larger than {max}, please contact the restaurant directly.', unavailable: 'Online reservations are not available yet.',
      error: 'We could not complete your reservation. Please try again.', taken: 'That table was just booked. Please pick another one.', loading: 'Loading tables…',
      promo: 'Your booking earned “{title}”. Show coupon {code} at the restaurant.', policy: 'Free cancellation up to 2h before. Each cancellation lowers your rating by 1 point.',
    },
    table: {
      cta: "I'm at the restaurant", title: 'Which table are you at?', hint: 'The number is on the table sign.', label: 'Table number', check: 'Continue',
      notFound: "We couldn't find that table. Please check the number.", welcome: 'Table {table}', choose: 'How can we help?', call: 'Call a server',
      callText: 'Someone from our team will come to your table.', order: 'Order from the menu', orderText: "Order here and we'll bring it to your table.",
      called: 'Done! A server is on the way.', banner: 'Table {table} · your orders go straight to your table', leave: 'Leave table', callAgain: 'Call a server',
    },
    cart: {
      title: 'Your order', empty: 'Your cart is empty.', emptyHint: 'Pick your dishes from the menu.', subtotal: 'Subtotal', discount: 'Discount', delivery: 'Delivery', free: 'Free', total: 'Total',
      coupon: 'Discount coupon', apply: 'Apply', couponInvalid: 'Invalid or expired coupon.', couponApplied: 'Coupon {code} applied', couponNotBest: 'You already have a better deal applied.',
      minOrder: 'Minimum order for delivery: {amount}', next: 'Continue', place: 'Place order · {amount}', placing: 'Sending order…', remove: 'Remove', decrease: 'Decrease', increase: 'Increase',
      deliveryTitle: 'Delivery', tableTitle: 'Order for table {table}', street: 'Street and number', complement: 'Apartment, suite', district: 'Neighborhood', city: 'City', reference: 'Landmark',
      notes: 'Notes', notesPlaceholder: 'E.g. no onions', payment: 'Payment', payOnDelivery: 'Pay on delivery', payOnDeliveryText: 'Cash, card or Pix at the door.',
      payAtTable: 'Pay at the table', payAtTableText: 'Settle the bill with our team.', payOnline: 'Card online', payOnlineText: 'Test mode: use 4242 4242 4242 4242.',
      cardNumber: 'Card number', expiry: 'Expiry (MM/YY)', cvc: 'CVC', holder: 'Name on card', estimate: 'Delivery in {min}–{max} min',
      deliveryOff: 'Delivery is not available right now.', successTitle: 'Order sent!', successText: 'Order #{number}. Track it in My account.',
      successTable: "Order #{number}. We'll bring it to your table.", view: 'Track order', continue: 'Back to the menu', loginToOrder: 'Sign in to order delivery', back: 'Back',
      error: 'We could not send your order. Please try again.',
    },
    orders: {
      status: { received: 'Received', preparing: 'Preparing', out_for_delivery: 'Out for delivery', ready: 'Ready', delivered: 'Delivered', canceled: 'Canceled' },
      delivery: 'Delivery', table: 'Table {table}', number: 'Order #{number}', cancel: 'Cancel order', cancelConfirm: 'Cancel this order? Your rating drops 1 point.',
    },
    auth: {
      login: 'Sign in', register: 'Create account', name: 'Name', email: 'Email', phone: 'Mobile', password: 'Password', passwordHint: 'At least 8 characters',
      toRegister: "Don't have an account? Create one", toLogin: 'Already have an account? Sign in', subtitle: 'Track your reservations and orders at {name}.', required: 'Sign in or create an account to continue.',
      wrong: 'Wrong email or password.', error: 'Please check your details and try again.', close: 'Close',
    },
    account: {
      title: 'My account', hello: 'Hi, {name}!', score: 'Your rating', scoreHint: 'Your rating goes up when you show up for reservations and receive your orders. Each cancellation costs 1 point.',
      reservations: 'My reservations', orders: 'My orders', none: 'Nothing here yet.', cancel: 'Cancel reservation', cancelConfirm: 'Cancel this reservation? Your rating drops 1 point.',
      cannotCancel: 'Can no longer be canceled', cancelUntil: 'You can cancel until {time}', back: 'Back to the site', signOut: 'Sign out',
      status: { confirmed: 'Confirmed', canceled: 'Canceled', attended: 'Attended', no_show: 'No-show' },
      policy: 'Cancel up to 2h before. Last-minute bookings can be canceled within 30 min, as long as more than 30 min remain.',
    },
    common: { guests: { one: '{count} guest', other: '{count} guests' }, seats: { one: '{count} seat', other: '{count} seats' }, items: { one: '{count} item', other: '{count} items' } },
    footer: { navigate: 'Explore', madeWith: 'Website made with', rights: '© {year} {name}. All rights reserved.' },
    areas: { kitchen: 'Kitchen', bathroom: 'Restrooms', bar: 'Bar', entrance: 'Entrance', stairs: 'Stairs', cashier: 'Cashier', wall: '', window: 'Window', plant: '', zone: 'Area' },
    notFound: { title: 'Website not found', text: 'This restaurant has not published its website yet, or the address is wrong.' },
  },
  de: {
    nav: { home: 'Start', menu: 'Speisekarte', about: 'Über uns', locations: 'Standorte', reserve: 'Tisch reservieren', open: 'Menü öffnen', close: 'Menü schließen', language: 'Sprache', signIn: 'Anmelden', account: 'Mein Konto', signOut: 'Abmelden', cart: 'Warenkorb', promos: 'Angebote' },
    menu: { all: 'Alle', featured: 'Favorit des Hauses', soldOut: 'Ausverkauft', empty: 'Noch keine Gerichte in dieser Kategorie.', add: '{name} hinzufügen', added: '{name} im Warenkorb' },
    promos: { eyebrow: 'Angebote', title: 'Nur für kurze Zeit', coupon: 'Gutschein', copy: 'Kopieren', copied: 'Gutschein kopiert!', until: 'Bis {date}', all: 'Auf die ganze Karte', items: 'Auf ausgewählte Gerichte', reservation: 'Bei Reservierung im Voraus', auto: 'Automatischer Rabatt', advance: 'Bei Reservierung {hours} Std. im Voraus' },
    visit: { eyebrow: 'Besuchen Sie uns', title: 'Öffnungszeiten & Kontakt', hours: 'Öffnungszeiten', closed: 'Geschlossen', contact: 'Kontakt', phone: 'Telefon', whatsapp: 'WhatsApp', email: 'E-Mail', instagram: 'Instagram', delivery: 'Lieferung bestellen', deliveryMessage: 'Hallo! Ich möchte etwas bestellen.', today: 'Heute' },
    locations: { directions: 'Route planen', call: 'Anrufen' },
    reserve: {
      date: 'Datum', time: 'Uhrzeit', party: 'Personen', floorPlan: 'Raumplan', floorPlanHint: 'Tippen Sie auf einen freien Tisch, um ihn auszuwählen.',
      legend: { available: 'Frei', selected: 'Ausgewählt', occupied: 'Belegt', unsuitable: 'Andere Größe' },
      yourReservation: 'Ihre Reservierung', selectTable: 'Wählen Sie einen Tisch im Plan', table: 'Tisch', name: 'Ihr Name', phone: 'Ihre Telefonnummer',
      confirm: 'Reservierung bestätigen', confirming: 'Wird bestätigt…', login: 'Zum Reservieren anmelden', successTitle: 'Reservierung bestätigt!',
      successText: 'Tisch {table} für {guests} am {date} um {time}.', code: 'Code', another: 'Weitere Reservierung', mine: 'Meine Reservierungen',
      noSlots: 'An diesem Tag sind keine Zeiten verfügbar.', noneAvailable: 'Zu dieser Zeit ist kein Tisch frei. Versuchen Sie eine andere Uhrzeit.',
      largeParty: 'Für Gruppen über {max} Personen kontaktieren Sie bitte direkt das Restaurant.', unavailable: 'Online-Reservierungen sind noch nicht verfügbar.',
      error: 'Die Reservierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.', taken: 'Dieser Tisch wurde gerade reserviert. Bitte wählen Sie einen anderen.', loading: 'Tische werden geladen…',
      promo: 'Ihre Reservierung erhält „{title}“. Zeigen Sie den Gutschein {code} im Restaurant.', policy: 'Kostenlose Stornierung bis 2 Std. vorher. Jede Stornierung senkt Ihre Bewertung um 1 Punkt.',
    },
    table: {
      cta: 'Ich bin im Restaurant', title: 'An welchem Tisch sitzen Sie?', hint: 'Die Nummer steht auf dem Tischschild.', label: 'Tischnummer', check: 'Weiter',
      notFound: 'Diesen Tisch haben wir nicht gefunden. Bitte prüfen Sie die Nummer.', welcome: 'Tisch {table}', choose: 'Wie können wir helfen?', call: 'Bedienung rufen',
      callText: 'Jemand aus dem Team kommt an Ihren Tisch.', order: 'Über die Karte bestellen', orderText: 'Bestellen Sie hier, wir bringen es an Ihren Tisch.',
      called: 'Erledigt! Die Bedienung ist unterwegs.', banner: 'Tisch {table} · Ihre Bestellungen gehen direkt an den Tisch', leave: 'Tisch verlassen', callAgain: 'Bedienung rufen',
    },
    cart: {
      title: 'Ihre Bestellung', empty: 'Ihr Warenkorb ist leer.', emptyHint: 'Wählen Sie Ihre Gerichte auf der Karte.', subtotal: 'Zwischensumme', discount: 'Rabatt', delivery: 'Lieferung', free: 'Gratis', total: 'Gesamt',
      coupon: 'Gutscheincode', apply: 'Einlösen', couponInvalid: 'Ungültiger oder abgelaufener Gutschein.', couponApplied: 'Gutschein {code} eingelöst', couponNotBest: 'Sie haben bereits ein besseres Angebot.',
      minOrder: 'Mindestbestellwert für Lieferung: {amount}', next: 'Weiter', place: 'Bestellen · {amount}', placing: 'Bestellung wird gesendet…', remove: 'Entfernen', decrease: 'Weniger', increase: 'Mehr',
      deliveryTitle: 'Lieferung', tableTitle: 'Bestellung für Tisch {table}', street: 'Straße und Hausnummer', complement: 'Zusatz', district: 'Stadtteil', city: 'Stadt', reference: 'Orientierungspunkt',
      notes: 'Hinweise', notesPlaceholder: 'z. B. ohne Zwiebeln', payment: 'Zahlung', payOnDelivery: 'Bei Lieferung zahlen', payOnDeliveryText: 'Bar, Karte oder Pix an der Tür.',
      payAtTable: 'Am Tisch zahlen', payAtTableText: 'Sie zahlen beim Team.', payOnline: 'Karte online', payOnlineText: 'Testmodus: 4242 4242 4242 4242 verwenden.',
      cardNumber: 'Kartennummer', expiry: 'Gültig bis (MM/JJ)', cvc: 'CVC', holder: 'Name auf der Karte', estimate: 'Lieferung in {min}–{max} Min.',
      deliveryOff: 'Lieferung ist gerade nicht verfügbar.', successTitle: 'Bestellung gesendet!', successText: 'Bestellung #{number}. Verfolgen Sie sie unter Mein Konto.',
      successTable: 'Bestellung #{number}. Wir bringen sie an Ihren Tisch.', view: 'Bestellung verfolgen', continue: 'Zurück zur Karte', loginToOrder: 'Zum Bestellen anmelden', back: 'Zurück',
      error: 'Die Bestellung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
    },
    orders: {
      status: { received: 'Eingegangen', preparing: 'In Zubereitung', out_for_delivery: 'Unterwegs', ready: 'Fertig', delivered: 'Zugestellt', canceled: 'Storniert' },
      delivery: 'Lieferung', table: 'Tisch {table}', number: 'Bestellung #{number}', cancel: 'Bestellung stornieren', cancelConfirm: 'Diese Bestellung stornieren? Ihre Bewertung sinkt um 1 Punkt.',
    },
    auth: {
      login: 'Anmelden', register: 'Konto erstellen', name: 'Name', email: 'E-Mail', phone: 'Handy', password: 'Passwort', passwordHint: 'Mindestens 8 Zeichen',
      toRegister: 'Noch kein Konto? Jetzt erstellen', toLogin: 'Schon ein Konto? Anmelden', subtitle: 'Verfolgen Sie Ihre Reservierungen und Bestellungen bei {name}.', required: 'Melden Sie sich an oder erstellen Sie ein Konto.',
      wrong: 'E-Mail oder Passwort ist falsch.', error: 'Bitte prüfen Sie Ihre Angaben.', close: 'Schließen',
    },
    account: {
      title: 'Mein Konto', hello: 'Hallo, {name}!', score: 'Ihre Bewertung', scoreHint: 'Ihre Bewertung steigt, wenn Sie zu Reservierungen erscheinen und Bestellungen annehmen. Jede Stornierung kostet 1 Punkt.',
      reservations: 'Meine Reservierungen', orders: 'Meine Bestellungen', none: 'Noch nichts hier.', cancel: 'Reservierung stornieren', cancelConfirm: 'Diese Reservierung stornieren? Ihre Bewertung sinkt um 1 Punkt.',
      cannotCancel: 'Nicht mehr stornierbar', cancelUntil: 'Stornierbar bis {time}', back: 'Zurück zur Website', signOut: 'Abmelden',
      status: { confirmed: 'Bestätigt', canceled: 'Storniert', attended: 'Erschienen', no_show: 'Nicht erschienen' },
      policy: 'Stornierung bis 2 Std. vorher. Kurzfristige Reservierungen können innerhalb von 30 Min. storniert werden, solange noch mehr als 30 Min. bleiben.',
    },
    common: { guests: { one: '{count} Person', other: '{count} Personen' }, seats: { one: '{count} Platz', other: '{count} Plätze' }, items: { one: '{count} Artikel', other: '{count} Artikel' } },
    footer: { navigate: 'Entdecken', madeWith: 'Website erstellt mit', rights: '© {year} {name}. Alle Rechte vorbehalten.' },
    areas: { kitchen: 'Küche', bathroom: 'WC', bar: 'Bar', entrance: 'Eingang', stairs: 'Treppe', cashier: 'Kasse', wall: '', window: 'Fenster', plant: '', zone: 'Bereich' },
    notFound: { title: 'Website nicht gefunden', text: 'Dieses Restaurant hat seine Website noch nicht veröffentlicht oder die Adresse ist falsch.' },
  },
};

/** t para os textos fixos: suporta {var} e plurais { one, other }. */
export function makeT(lang) {
  const dict = UI[lang] ?? UI.pt;
  return (key, vars = {}) => {
    const find = (d) => key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), d);
    let entry = find(dict) ?? find(UI.pt);
    if (entry && typeof entry === 'object' && 'other' in entry) entry = vars.count === 1 ? entry.one : entry.other;
    if (typeof entry !== 'string') return key;
    return entry.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? String(vars[name]) : m));
  };
}
