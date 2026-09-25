import { Bookmark, ChevronDown, Menu, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { CATEGORIES } from "../data/categories";
import { categoryCounts } from "../data/stats";
import { useDisclosure } from "../hooks/useDisclosure";
import { useRecipeBox } from "../hooks/useRecipeBox";
import { site } from "../site.config";
import { BrandMark } from "./BrandMark";
import { CategoryIcon } from "./CategoryIcon";
import { DisplaySettings } from "./DisplaySettings";
import styles from "./Header.module.css";
import { SurpriseButton } from "./SurpriseButton";

const PAGES = [
  { to: "/recipes", label: "All Recipes" },
  { to: "/notebook", label: `${site.name}'s Notebook` },
  { to: "/about", label: `About ${site.name}` },
];

export function Header({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { saved } = useRecipeBox();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (menuOpen) setMenuOpen(false);
  }

  return (
    <header role="banner" className={styles.header} data-print="hide">
      <div className={`page ${styles.bar}`}>
        <Link to="/" className={styles.brand}>
          <BrandMark className={styles.mark} />
          <span className={styles.wordmark}>{site.title}</span>
        </Link>

        <nav aria-label="Main" className={styles.nav}>
          <NavLink to="/recipes" end className={styles.navLink}>
            {PAGES[0].label}
          </NavLink>
          <CategoriesMenu />
          {PAGES.slice(1).map((page) => (
            <NavLink key={page.to} to={page.to} className={styles.navLink}>
              {page.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <button type="button" className={styles.search} onClick={onOpenSearch} aria-keyshortcuts="/ Control+K Meta+K">
            <Search aria-hidden="true" />
            <span className={styles.searchLabel}>Search recipes</span>
            <kbd className={styles.kbd} aria-hidden="true">
              /
            </kbd>
          </button>
          <SurpriseButton variant="icon" />
          <Link
            to="/favorites"
            className={`icon-btn ${styles.box}`}
            aria-label={`My Recipe Box, ${saved.length} saved`}
            title="My Recipe Box"
          >
            <Bookmark aria-hidden="true" />
            {saved.length > 0 && (
              <span className={styles.count} aria-hidden="true">
                {saved.length}
              </span>
            )}
          </Link>
          <DisplayMenu />
          <button
            type="button"
            className={`icon-btn ${styles.menuButton}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && <MobileMenu />}
    </header>
  );
}

function CategoriesMenu() {
  const { open, toggle, close, ref } = useDisclosure<HTMLDivElement>();
  const location = useLocation();
  const active = location.pathname.startsWith("/category/");

  return (
    <div ref={ref} className={styles.dropdown}>
      <button
        type="button"
        className={`${styles.navLink} ${active ? "active" : ""}`}
        aria-expanded={open}
        aria-controls="categories-menu"
        onClick={toggle}
      >
        Categories
        <ChevronDown aria-hidden="true" className={styles.chevron} />
      </button>
      {open && (
        <div id="categories-menu" className={`${styles.panel} ${styles.categoriesPanel}`}>
          <ul className={styles.categoryList}>
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link to={`/category/${category.slug}`} className={styles.categoryLink} onClick={close}>
                  <CategoryIcon category={category.slug} className={styles.categoryIcon} />
                  <span>{category.label}</span>
                  <span className={styles.categoryCount}>{categoryCounts[category.slug]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DisplayMenu() {
  const { open, toggle, ref } = useDisclosure<HTMLDivElement>();
  return (
    <div ref={ref} className={`${styles.dropdown} ${styles.displayMenu}`}>
      <button
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-controls="display-menu"
        aria-label="Display settings"
        title="Display settings"
        onClick={toggle}
      >
        <SlidersHorizontal aria-hidden="true" />
      </button>
      {open && (
        <div id="display-menu" className={`${styles.panel} ${styles.displayPanel}`}>
          <DisplaySettings />
        </div>
      )}
    </div>
  );
}

function MobileMenu() {
  return (
    <div id="mobile-menu" className={styles.mobileMenu}>
      <div className="page">
        <nav aria-label="Mobile">
          <ul className={styles.mobilePages}>
            {PAGES.map((page) => (
              <li key={page.to}>
                <NavLink to={page.to} end className={styles.mobileLink}>
                  {page.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/favorites" className={styles.mobileLink}>
                My Recipe Box
              </NavLink>
            </li>
          </ul>
          <p className={styles.mobileHeading}>Categories</p>
          <ul className={styles.mobileCategories}>
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link to={`/category/${category.slug}`} className={styles.categoryLink}>
                  <CategoryIcon category={category.slug} className={styles.categoryIcon} />
                  <span>{category.label}</span>
                  <span className={styles.categoryCount}>{categoryCounts[category.slug]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className={styles.mobileHeading}>Display</p>
        <DisplaySettings />
      </div>
    </div>
  );
}
