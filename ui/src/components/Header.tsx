import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <div className="header-mark">DS</div>
          <div>
            <p className="header-eyebrow">Dark Swap</p>
            <h1 className="header-title">Confidential cUSDT Exchange</h1>
          </div>
        </div>
        <div className="header-actions">
          <span className="header-pill">Sepolia | Fixed 1 ETH = 2300 cUSDT</span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
