import { Link, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';

type NavItem = {
  label: string;
  path: string;
  icon: string;
};

function matches(pathname: string, path: string) {
  if (path === '/app') {
    return pathname === '/app';
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function topTabMatches(pathname: string, path: string) {
  if (path === '/app') {
    return pathname === '/app';
  }
  return matches(pathname, path);
}

export default function SidebarLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdminArea = location.pathname.startsWith('/admin');

  const primaryNav: NavItem[] = isAdminArea
    ? [
        { label: 'Overview', path: '/admin/plans', icon: 'monitoring' },
        { label: 'Organizations', path: '/admin/orgs', icon: 'apartment' },
        { label: 'Vouchers', path: '/admin/vouchers', icon: 'loyalty' },
      ]
    : [
        { label: 'Overview', path: '/app', icon: 'space_dashboard' },
        { label: 'Orders', path: '/app/orders', icon: 'inventory_2' },
        { label: 'Products', path: '/app/products', icon: 'package_2' },
        { label: 'Print Labels', path: '/app/print', icon: 'label' },
        { label: 'Queue', path: '/app/print-queue', icon: 'assignment' },
        { label: 'AI Insights', path: '/app/intelligence', icon: 'psychology' },
        { label: 'Agents', path: '/app/agents', icon: 'print_connect' },
      ];

  const footerNav: NavItem[] = isAdminArea
    ? []
    : [
        { label: 'Team', path: '/app/team', icon: 'groups' },
        { label: 'Billing', path: '/app/billing', icon: 'credit_card' },
        { label: 'Support', path: '/app/support', icon: 'help' },
      ];

  const topTabs = isAdminArea
    ? [
        { label: 'Plans', path: '/admin/plans' },
        { label: 'Organizations', path: '/admin/orgs' },
        { label: 'Vouchers', path: '/admin/vouchers' },
      ]
    : [
        { label: 'Overview', path: '/app' },
        { label: 'Orders', path: '/app/orders' },
        { label: 'Products', path: '/app/products' },
        { label: 'Print Queue', path: '/app/print-queue' },
        { label: 'Print Labels', path: '/app/print' },
      ];

  const mobileNav = isAdminArea
    ? [
        { label: 'Plans', path: '/admin/plans', icon: 'credit_card' },
        { label: 'Orgs', path: '/admin/orgs', icon: 'apartment' },
      ]
    : [
        { label: 'Home', path: '/app', icon: 'space_dashboard' },
        { label: 'Orders', path: '/app/orders', icon: 'inventory_2' },
        { label: 'Products', path: '/app/products', icon: 'package_2' },
        { label: 'Print', path: '/app/print', icon: 'label' },
      ];

  const sidebarActive = (path: string) => {
    return matches(location.pathname, path);
  };

  return (
    <div className="mock-shell">
      <aside className={`mock-sidebar ${sidebarOpen ? 'mock-sidebar--open' : ''}`} id="sidebar">
        <div className="mock-sidebar__inner">
          <Link to={isAdminArea ? '/admin/plans' : '/app'} className="mock-brand">
            <div className="mock-brand__mark">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>forest</span>
            </div>
            <div>
              <h1>Canopy</h1>
              <p>{isAdminArea ? 'Platform Control' : 'Order Fulfillment'}</p>
            </div>
          </Link>

          {!isAdminArea ? (
            <button type="button" className="mock-primary-action">
              <span className="material-symbols-outlined">add</span>
              New Shipment
            </button>
          ) : null}

          <nav className="mock-sidebar__nav">
            {primaryNav.map((item) => {
              const active = sidebarActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={active ? 'mock-side-link mock-side-link--active' : 'mock-side-link'}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {footerNav.length > 0 ? (
            <div className="mock-sidebar__footer">
              {footerNav.map((item) => {
                const active = sidebarActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={active ? 'mock-side-link mock-side-link--active' : 'mock-side-link'}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </aside>

      {sidebarOpen ? <button type="button" className="mock-sidebar-overlay" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="mock-main">
        <header className="mock-topbar">
          <div className="mock-topbar__left">
            <button type="button" className="mock-mobile-menu" onClick={() => setSidebarOpen((value) => !value)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <label className="mock-search">
              <span className="material-symbols-outlined">search</span>
              <input type="text" readOnly value="" placeholder={isAdminArea ? 'Search plans, orgs...' : 'Search orders, SKU...'} />
            </label>
          </div>

          <nav className="mock-topnav">
            {topTabs.map((tab) => {
              const active = topTabMatches(location.pathname, tab.path);
              return (
                <Link key={tab.path} to={tab.path} className={active ? 'mock-topnav__item mock-topnav__item--active' : 'mock-topnav__item'}>
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="mock-topbar__right">
            {!isAdminArea ? (
              <div className="mock-ai-chip">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                AI Intelligence
              </div>
            ) : null}
            <button type="button" className="mock-icon-button">
              <span className="material-symbols-outlined">notifications</span>
              <span className="mock-icon-dot" />
            </button>
            <button type="button" className="mock-icon-button mock-desktop-only">
              <span className="material-symbols-outlined">history</span>
            </button>
            <div className="mock-avatar">
              <span>A</span>
            </div>
          </div>
        </header>

        <main className="mock-content">
          <Outlet />
        </main>

        <nav className="mock-mobile-nav">
          {mobileNav.map((item) => {
            const active = matches(location.pathname, item.path);
            return (
              <Link key={item.path} to={item.path} className={active ? 'mock-mobile-nav__item mock-mobile-nav__item--active' : 'mock-mobile-nav__item'}>
                <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
