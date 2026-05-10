export type PublicNavItem = {
  description: string;
  href: string;
  title: string;
};

export type ScheduleBlock = {
  details: string;
  title: string;
};

export type GameCategory = {
  examples: string[];
  title: string;
};

export type RuleItem = {
  description: string;
  title: string;
};

export type ContactItem = {
  description: string;
  title: string;
  value: string;
};

export const publicNavItems: PublicNavItem[] = [
  {
    href: "/schedule",
    title: "Расписание",
    description: "Часы работы клуба и ближайшие форматы встреч."
  },
  {
    href: "/games",
    title: "Игры",
    description: "Подборки настольных и варгейм-систем по уровню сложности."
  },
  {
    href: "/rules",
    title: "Правила",
    description: "Базовые правила посещения, записи и поведения на встречах."
  },
  {
    href: "/contacts",
    title: "Контакты",
    description: "Каналы связи и как найти клуб."
  }
];

export const scheduleBlocks: ScheduleBlock[] = [
  {
    title: "Будние вечера",
    details: "Формат открытых столов с 18:00 до 22:30."
  },
  {
    title: "Субботние сессии",
    details: "Длинные игровые сессии с 12:00 до 21:00."
  },
  {
    title: "Турнирные окна",
    details: "Отдельные слоты под варгеймы и лиги по предварительной записи."
  }
];

export const gameCategories: GameCategory[] = [
  {
    title: "Быстрые партии",
    examples: ["Ticket to Ride", "Азул", "Каркассон"]
  },
  {
    title: "Кооперативы",
    examples: ["Pandemic", "Spirit Island", "Gloomhaven: Jaws of the Lion"]
  },
  {
    title: "Варгеймы",
    examples: ["Kill Team", "Warcry", "Bolt Action"]
  }
];

export const rules: RuleItem[] = [
  {
    title: "Бронируйте заранее",
    description:
      "Выбирайте удобное время и отправляйте заявку до начала игровой сессии."
  },
  {
    title: "Уважайте расписание",
    description:
      "Если планы поменялись, отмените запись заранее, чтобы освободить стол."
  },
  {
    title: "Берегите инвентарь",
    description:
      "Игровые компоненты, поля и миниатюры клуба нужно возвращать в полном комплекте."
  }
];

export const contacts: ContactItem[] = [
  {
    title: "Telegram клуба",
    value: "@tabletop_club",
    description: "Оперативные новости, анонсы встреч и быстрые вопросы."
  },
  {
    title: "Почта",
    value: "club@example.com",
    description: "Для партнерств, предложений и организационных запросов."
  },
  {
    title: "Локация",
    value: "Москва, центр (подробности после записи)",
    description: "Точный адрес направляется участникам подтвержденных встреч."
  }
];
