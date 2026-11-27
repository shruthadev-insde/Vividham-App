/* Vividham — English / ಕನ್ನಡ labels. Icons carry the meaning; words are a second layer.
   Kannada strings are a first draft — have a native speaker at the shop review them. */
(function (V) {
  const D = {
    tab_today: ['Today', 'ಇಂದು'], tab_costumes: ['Costumes', 'ಉಡುಪುಗಳು'], tab_orders: ['Orders', 'ಆರ್ಡರ್'], tab_reminders: ['Reminders', 'ಜ್ಞಾಪನೆ'], tab_more: ['More', 'ಇನ್ನಷ್ಟು'],
    new_rental: ['New rental', 'ಹೊಸ ಬಾಡಿಗೆ'], bag: ['Rental bag', 'ಬಾಡಿಗೆ ಚೀಲ'], add_to_bag: ['Add to bag', 'ಚೀಲಕ್ಕೆ ಸೇರಿಸಿ'],
    return: ['Return', 'ವಾಪಸ್'], return_check: ['Return & check', 'ವಾಪಸ್ & ಪರಿಶೀಲನೆ'], hand_over: ['Hand over', 'ಕೊಡಿ'], items_back: ['Items back', 'ವಸ್ತು ಬಂತು'],
    add_fine: ['Add fine', 'ದಂಡ ಹಾಕಿ'], remind_2: ['2-day reminder', '2 ದಿನದ ಜ್ಞಾಪನೆ'], whatsapp: ['WhatsApp', 'ವಾಟ್ಸಾಪ್'], called: ['Called instead', 'ಕರೆ ಮಾಡಿದೆ'],
    all_in: ['All in', 'ಎಲ್ಲಾ ಬಂದಿದೆ'], costumes_back: ['Costumes back', 'ಬಂದ ಉಡುಪು'], missing: ['Missing', 'ಕಾಣೆಯಾಗಿದೆ'], still_out: ['Still out', 'ಇನ್ನೂ ಬಂದಿಲ್ಲ'],
    deposit: ['Deposit', 'ಠೇವಣಿ'], refund: ['Refund', 'ಹಿಂತಿರುಗಿಸಿ'], collect: ['Collect', 'ಪಡೆಯಿರಿ'], rent: ['Rent', 'ಬಾಡಿಗೆ'], ready: ['ready', 'ಸಿದ್ಧ'], per_set: ['per set', 'ಪ್ರತಿ ಸೆಟ್'],
    all: ['All', 'ಎಲ್ಲಾ'], kids: ['Kids', 'ಮಕ್ಕಳು'], adults: ['Adults', 'ದೊಡ್ಡವರು'], search: ['Search costumes, colours, events…', 'ಹುಡುಕಿ…'],
    coming_back: ['Coming back', 'ವಾಪಸ್ ಬರಬೇಕು'], reminders_due: ['Reminders', 'ಜ್ಞಾಪನೆ'], overdue: ['Overdue', 'ತಡವಾಗಿದೆ'], going_out: ['Going out', 'ಹೊರಗೆ ಹೋಗುವುದು'], in_cleaning: ['In cleaning', 'ಸ್ವಚ್ಛತೆಯಲ್ಲಿ'],
    due_today: ['due today', 'ಇಂದು'], not_returned: ['not returned', 'ಬಂದಿಲ್ಲ'], pickups: ['pickups today', 'ಇಂದು ಕೊಡಬೇಕು'], sets_buffer: ['sets resting', 'ಸೆಟ್‌ಗಳು'],
    needs_attention: ['Needs attention', 'ಗಮನಿಸಿ'], next_7: ['Next 7 days', 'ಮುಂದಿನ 7 ದಿನ'], shop_by_event: ['Shop by occasion', 'ಸಂದರ್ಭದ ಪ್ರಕಾರ'],
    st_booked: ['Booked', 'ಬುಕ್ ಆಗಿದೆ'], st_out: ['With customer', 'ಗ್ರಾಹಕರ ಬಳಿ'], st_overdue: ['Overdue', 'ತಡವಾಗಿದೆ'], st_partial: ['Awaiting items', 'ಬಾಕಿ ಇದೆ'], st_closed: ['Closed', 'ಮುಗಿದಿದೆ'],
    st_cancelled: ['Cancelled', 'ರದ್ದು'], st_back: ['Back', 'ವಾಪಸ್'], st_clean: ['Clean', 'ಸ್ವಚ್ಛ'],
    complete_look: ['Complete the look', 'ಜೊತೆಗೆ ಸೇರಿಸಿ'], make_scene: ['Make it a scene', 'ಗುಂಪು ವೇಷ'], included: ['In every set', 'ಸೆಟ್‌ನಲ್ಲಿ ಇದೆ'], size_guide: ['Size guide', 'ಅಳತೆ'],
    choose_colour: ['Colour', 'ಬಣ್ಣ'], free_dates: ['free for these dates', 'ಈ ದಿನಗಳಿಗೆ ಲಭ್ಯ'], pickup: ['Pickup', 'ತೆಗೆದುಕೊಳ್ಳುವ ದಿನ'], return_by: ['Return by', 'ವಾಪಸ್ ದಿನ'],
    everything_back: ['Everything is back', 'ಎಲ್ಲಾ ವಾಪಸ್ ಬಂದಿದೆ'], choose: ['Choose one', 'ಒಂದನ್ನು ಆರಿಸಿ'], complete: ['Complete return', 'ವಾಪಸ್ ಮುಗಿಸಿ'],
    lang: ['ಕನ್ನಡ', 'EN'], showcase: ['Showcase', 'ಪ್ರದರ್ಶನ'], studio: ['Render studio', 'ಫೋಟೋ ಸ್ಟುಡಿಯೋ'],
    customers: ['Customers', 'ಗ್ರಾಹಕರು'], stock: ['Stock & cleaning', 'ಸ್ಟಾಕ್'], choreo: ['Choreography', 'ನೃತ್ಯ ಸಂಯೋಜನೆ'], settings: ['Settings', 'ಸೆಟ್ಟಿಂಗ್'], about: ['About', 'ಮಾಹಿತಿ'],
    calendar: ['Calendar', 'ಕ್ಯಾಲೆಂಡರ್'],
    missing_for_bag: ['Often forgotten', 'ಮರೆಯಬೇಡಿ'], add: ['Add', 'ಸೇರಿಸಿ'], added: ['Added', 'ಸೇರಿದೆ'], studio_photo: ['Studio photo coming', 'ಫೋಟೋ ಬರಲಿದೆ']
  };
  V.lang = () => (V.state && V.state.settings.lang) || 'en';
  V.t = k => { const e = D[k]; if (!e) return k; return V.lang() === 'kn' ? e[1] : e[0]; };
  // bilingual: English word with Kannada underneath (used where space allows)
  V.t2 = k => { const e = D[k]; if (!e) return k; return V.lang() === 'kn' ? `<span class="kn">${e[1]}</span>` : `${e[0]}`; };
  V.I18N = D;
})(window.V = window.V || {});
