import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      nav: {
        home: 'Home',
        features: 'Features',
        security: 'Security',
        contact: 'Contact',
        login: 'Login',
        register: 'Register'
      },
      hero: {
        title: 'Secure Chat: Your Privacy, Our Priority',
        subtitle: 'End-to-end encrypted messaging for everyone',
        cta: 'Try Now'
      },
      features: {
        title: 'Why Choose Secure Chat',
        card1: {
          title: 'Advanced Encryption',
          description: 'Your messages are protected with state-of-the-art encryption'
        },
        card2: {
          title: 'Intuitive Interface',
          description: 'Simple and clean design for the best user experience'
        },
        card3: {
          title: 'Cross-Platform Support',
          description: 'Available on all your devices'
        }
      },
      security: {
        title: 'Your Security, Guaranteed',
        description: 'Our encryption system ensures your messages stay private'
      },
      chat: {
        title: "Let's Talk",
        placeholder: 'Type your message...',
        initial: 'Hi, how can I help you?'
      },
      footer: {
        about: 'About Us',
        quickLinks: 'Quick Links',
        followUs: 'Follow Us'
      }
    }
  },
  es: {
    translation: {
      nav: {
        home: 'Inicio',
        features: 'Características',
        security: 'Seguridad',
        contact: 'Contacto',
        login: 'Iniciar Sesión',
        register: 'Registrarse'
      },
      hero: {
        title: 'Chat Seguro: Tu Privacidad, Nuestra Prioridad',
        subtitle: 'Mensajería cifrada de extremo a extremo para todos',
        cta: 'Prueba Ahora'
      },
      features: {
        title: 'Por qué elegir Chat Seguro',
        card1: {
          title: 'Cifrado Avanzado',
          description: 'Tus mensajes están protegidos con cifrado de última generación'
        },
        card2: {
          title: 'Interfaz Intuitiva',
          description: 'Diseño simple y limpio para la mejor experiencia'
        },
        card3: {
          title: 'Soporte Multiplataforma',
          description: 'Disponible en todos tus dispositivos'
        }
      },
      security: {
        title: 'Tu Seguridad, Garantizada',
        description: 'Nuestro sistema de cifrado asegura que tus mensajes sean privados'
      },
      chat: {
        title: 'Hablemos',
        placeholder: 'Escribe tu mensaje...',
        initial: '¡Hola! ¿Cómo puedo ayudarte?'
      },
      footer: {
        about: 'Sobre Nosotros',
        quickLinks: 'Enlaces Rápidos',
        followUs: 'Síguenos'
      }
    }
  },
  ru: {
    translation: {
      nav: {
        home: 'Главная',
        features: 'Функции',
        security: 'Безопасность',
        contact: 'Контакты',
        login: 'Войти',
        register: 'Регистрация'
      },
      hero: {
        title: 'Безопасный Чат: Ваша Конфиденциальность - Наш Приоритет',
        subtitle: 'Сквозное шифрование для всех',
        cta: 'Попробовать'
      },
      features: {
        title: 'Почему выбирают Secure Chat',
        card1: {
          title: 'Продвинутое Шифрование',
          description: 'Ваши сообщения защищены современным шифрованием'
        },
        card2: {
          title: 'Интуитивный Интерфейс',
          description: 'Простой и чистый дизайн для лучшего опыта'
        },
        card3: {
          title: 'Кросс-платформенность',
          description: 'Доступно на всех ваших устройствах'
        }
      },
      security: {
        title: 'Ваша Безопасность Гарантирована',
        description: 'Наша система шифрования обеспечивает конфиденциальность ваших сообщений'
      },
      chat: {
        title: 'Давайте поговорим',
        placeholder: 'Введите ваше сообщение...',
        initial: 'Привет, как я могу помочь?'
      },
      footer: {
        about: 'О Нас',
        quickLinks: 'Быстрые Ссылки',
        followUs: 'Подписывайтесь'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;