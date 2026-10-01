// Ícones de linha (grade 24px, traço 1.8) — os mesmos do template Brasa Grill, mais alguns do painel.
function Icon({ children, size = 20, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

const make = (paths) => (p) => <Icon {...p}>{paths}</Icon>;

export const MapPinIcon = make(<><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const PhoneIcon = make(<path d="M5 4h3l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />);
export const ClockIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const CalendarIcon = make(<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>);
export const UsersIcon = make(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.2 3.2 0 0 1 0 6.2M21 20a6 6 0 0 0-3.5-5.4" /></>);
export const CheckIcon = make(<path d="M5 12.5l4.2 4.2L19 7" />);
export const CloseIcon = make(<path d="M6 6l12 12M18 6L6 18" />);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const MinusIcon = make(<path d="M5 12h14" />);
export const TrashIcon = make(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />);
export const ArrowRightIcon = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const ArrowLeftIcon = make(<path d="M19 12H5M11 6l-6 6 6 6" />);
export const ChevronRightIcon = make(<path d="M9 6l6 6-6 6" />);
export const ChevronLeftIcon = make(<path d="M15 6l-6 6 6 6" />);
export const ChevronDownIcon = make(<path d="M6 9l6 6 6-6" />);
export const ChevronUpIcon = make(<path d="M6 15l6-6 6 6" />);
export const AlertIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></>);
export const FlameIcon = make(<path d="M12 3c1 3.5 6 5.8 6 11a6 6 0 0 1-12 0c0-2.8 1.4-4.7 2.8-6 .2 1.8 1 3 2.4 3.6C11 8.8 11.4 6 12 3z" />);
export const KnifeIcon = make(<><path d="M4 20L15.5 8.5c1.5-1.5 1.5-4 0-5.5L6 12.5l2.5 2.5" /><path d="M14 10l6 6-2 2-6-6" /></>);
export const GlassIcon = make(<path d="M7 3h10l-1 7a4 4 0 0 1-8 0zM12 14v7M8.5 21h7" />);
export const TruckIcon = make(<><path d="M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></>);
export const StoreIcon = make(<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9.5 20v-6h5v6" />);
export const CardIcon = make(<><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></>);
export const LockIcon = make(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const ShieldIcon = make(<><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>);
export const MailIcon = make(<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7.5 8 5.5 8-5.5" /></>);
export const InstagramIcon = make(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>);
export const WhatsAppIcon = (p) => (
  <Icon {...p}>
    <path d="M3.2 20.8l1.3-4.3A9 9 0 1 1 8 19.6z" />
    <path fill="currentColor" stroke="none" d="M8.7 7.9c.2-.5.5-.6.8-.6h.6c.2 0 .4.1.5.4l.8 1.8c.1.3 0 .5-.1.7l-.5.6c-.1.1-.2.4 0 .6.6 1 1.4 1.8 2.4 2.4.2.1.4.1.6 0l.6-.6c.2-.2.4-.2.7-.1l1.8.8c.3.1.4.3.4.5v.6c0 .3-.1.6-.6.9-.7.4-1.9.5-3.5-.3a9.6 9.6 0 0 1-4.1-4.1c-.8-1.6-.7-2.8-.4-3.6z" />
  </Icon>
);
export const ImageIcon = make(<><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>);
export const CameraIcon = make(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>);
export const StarIcon = make(<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />);
export const EyeIcon = make(<><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></>);
export const EyeOffIcon = make(<><path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.3 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 4.4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>);
export const GlobeIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>);
export const LinkIcon = make(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>);
export const ExternalIcon = make(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>);
export const CopyIcon = make(<><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>);
export const BookIcon = make(<><path d="M5 19.5v-15A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5A1.5 1.5 0 0 0 6.5 21H19" /><path d="M9 7.5h6M9 11h4" /></>);
export const InfoIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></>);
export const PaletteIcon = make(<><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h2A4.5 4.5 0 0 0 21 10.7C21 6.4 17 3 12 3z" /><circle cx="7.5" cy="11" r="1.1" /><circle cx="10.5" cy="7" r="1.1" /><circle cx="15" cy="7.5" r="1.1" /></>);
export const LayoutIcon = make(<><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M3 9h18M9 21V9" /></>);
export const TableIcon = make(<><rect x="6" y="7" width="12" height="10" rx="2" /><circle cx="12" cy="3.8" r="1.4" /><circle cx="12" cy="20.2" r="1.4" /><circle cx="2.8" cy="12" r="1.4" /><circle cx="21.2" cy="12" r="1.4" /></>);
export const MonitorIcon = make(<><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8.5 21h7M12 17v4" /></>);
export const SmartphoneIcon = make(<><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18h2" /></>);
export const LogoutIcon = make(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>);
export const RotateIcon = make(<><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></>);
export const DuplicateIcon = make(<><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></>);
export const LayersIcon = make(<><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>);
export const SparkIcon = make(<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />);
export const PixIcon = make(<><path d="M12 2.8l3.6 3.6a2 2 0 0 0 1.4.6h1.3M12 2.8L8.4 6.4A2 2 0 0 1 7 7H5.7" /><path d="M12 21.2l3.6-3.6a2 2 0 0 1 1.4-.6h1.3M12 21.2l-3.6-3.6A2 2 0 0 0 7 17H5.7" /><path d="M5.7 7L2.8 9.9a3 3 0 0 0 0 4.2L5.7 17M18.3 7l2.9 2.9a3 3 0 0 1 0 4.2L18.3 17" /></>);
export const DragIcon = make(<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" />);
export const UndoIcon = make(<><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>);
export const BagIcon = make(<><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>);
export const TagIcon = make(<><path d="M3.5 12.6V5A1.5 1.5 0 0 1 5 3.5h7.6l8.4 8.4-9 9z" /><circle cx="8" cy="8" r="1.5" /></>);
export const SaveIcon = make(<><path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>);
export const RedoIcon = make(<><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>);
export const SettingsIcon = make(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
export const BellIcon = make(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const TypeIcon = make(<path d="M5 6V4h14v2M12 4v16M9 20h6" />);
