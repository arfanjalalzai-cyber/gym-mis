import {
  Facebook,
  Twitter,
  Instagram,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { useTranslation } from "react-i18next";

function Footer() {
  const { t } = useTranslation();

  const quickLinks = [
    { key: "aboutUs", label: t("footer.quickLinks.aboutUs") },
    { key: "academics", label: t("footer.quickLinks.academics") },
    { key: "admissions", label: t("footer.quickLinks.admissions") },
    { key: "newsEvents", label: t("footer.quickLinks.newsEvents") },
    { key: "contact", label: t("footer.quickLinks.contact") },
  ];

  const portals = [
    { key: "member", label: t("footer.portals.member") },
    { key: "trainer", label: t("footer.portals.trainer") },
    { key: "staff", label: t("footer.portals.staff") },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Gym Info */}
          <div className="col-span-2 md:col-span-1">
            <img
              src="/images/logo.png"
              alt="Gym Logo"
              className="mb-4"
            />

            <p className="text-text-secondary mb-4">
              {t("footer.gymDescription")}
            </p>

            <div className="flex space-x-3">
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-surface hover:bg-primary rounded-lg flex items-center justify-center transition group"
                >
                  <Icon className="w-5 h-5 text-text-secondary group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">
              {t("footer.quickLinks.title")}
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.key}>
                  <a className="text-text-secondary hover:text-primary">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h3 className="text-lg font-bold mb-4">
              {t("footer.portals.title")}
            </h3>
            <ul className="space-y-2">
              {portals.map((link) => (
                <li key={link.key}>
                  <a className="text-text-secondary hover:text-primary">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">
              {t("footer.contactUs.title")}
            </h3>

            <ul className="space-y-3 text-text-secondary">
              <li className="flex gap-3">
                <MapPin className="text-primary" />
                {t("footer.contactUs.address")}
              </li>

              <li className="flex gap-3">
                <Phone className="text-primary" />
                +93 767 269 624
              </li>

              <li className="flex gap-3">
                <Mail className="text-primary" />
                info@gym.com
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border mt-8 pt-6 text-center text-text-secondary">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
