import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract, formatUnits, isAddress, parseEther } from 'ethers';

import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CUSDT_ABI, CUSDT_ADDRESS, SWAP_ABI, SWAP_ADDRESS } from '../config/contracts';
import '../styles/SwapApp.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_HANDLE = `0x${'0'.repeat(64)}`;

export function SwapApp() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();

  const [ethAmount, setEthAmount] = useState('');
  const [swapStatus, setSwapStatus] = useState('');
  const [swapError, setSwapError] = useState('');
  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');

  const isSwapReady = isAddress(SWAP_ADDRESS) && SWAP_ADDRESS.toLowerCase() !== ZERO_ADDRESS;
  const isCusdtReady = isAddress(CUSDT_ADDRESS) && CUSDT_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

  const parsedEth = useMemo(() => {
    if (!ethAmount) {
      return null;
    }
    try {
      return parseEther(ethAmount);
    } catch {
      return null;
    }
  }, [ethAmount]);

  const { data: quotedCusdt } = useReadContract({
    address: SWAP_ADDRESS,
    abi: SWAP_ABI,
    functionName: 'quoteCusdt',
    args: parsedEth ? [parsedEth] : undefined,
    query: {
      enabled: !!parsedEth && isSwapReady,
    },
  });

  const { data: cusdtDecimals } = useReadContract({
    address: CUSDT_ADDRESS,
    abi: CUSDT_ABI,
    functionName: 'decimals',
    query: {
      enabled: isCusdtReady,
    },
  });

  const decimals =
    typeof cusdtDecimals === 'bigint'
      ? Number(cusdtDecimals)
      : typeof cusdtDecimals === 'number'
        ? cusdtDecimals
        : 6;

  const {
    data: encryptedBalance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: CUSDT_ADDRESS,
    abi: CUSDT_ABI,
    functionName: 'confidentialBalanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isCusdtReady,
    },
  });

  useEffect(() => {
    setDecryptedBalance(null);
    setDecryptError('');
  }, [encryptedBalance]);

  const formattedQuote = useMemo(() => {
    if (!parsedEth) {
      return '--';
    }
    if (!quotedCusdt) {
      return '...';
    }
    return formatUnits(quotedCusdt as bigint, decimals);
  }, [parsedEth, quotedCusdt, decimals]);

  const encryptedHandleLabel = useMemo(() => {
    if (isBalanceLoading) {
      return 'Loading...';
    }
    if (!encryptedBalance) {
      return '--';
    }
    return typeof encryptedBalance === 'string' ? encryptedBalance : String(encryptedBalance);
  }, [encryptedBalance, isBalanceLoading]);

  const handleSwap = async () => {
    setSwapError('');
    setSwapStatus('');

    if (!isConnected || !address) {
      setSwapError('Connect your wallet to swap.');
      return;
    }
    if (!isSwapReady) {
      setSwapError('Swap contract address is missing.');
      return;
    }
    if (!parsedEth || parsedEth === 0n) {
      setSwapError('Enter a valid ETH amount.');
      return;
    }

    try {
      const signer = signerPromise ? await signerPromise : null;
      if (!signer) {
        setSwapError('Signer is not available.');
        return;
      }

      const swapContract = new Contract(SWAP_ADDRESS, SWAP_ABI, signer);
      setSwapStatus('Submitting swap...');
      const tx = await swapContract.swapEthForMyCusdt({ value: parsedEth });
      setSwapStatus('Waiting for confirmation...');
      await tx.wait();
      setSwapStatus('Swap confirmed.');
      refetchBalance();
    } catch (error) {
      console.error('Swap failed:', error);
      setSwapError(error instanceof Error ? error.message : 'Swap failed.');
      setSwapStatus('');
    }
  };

  const handleDecrypt = async () => {
    setDecryptError('');
    if (!instance || !address || !encryptedBalance) {
      setDecryptError('Missing encryption service or balance handle.');
      return;
    }
    if (!isCusdtReady) {
      setDecryptError('cUSDT contract address is missing.');
      return;
    }
    if (encryptedBalance === ZERO_HANDLE) {
      setDecryptedBalance(formatUnits(0, decimals));
      return;
    }

    setIsDecrypting(true);
    try {
      const signer = signerPromise ? await signerPromise : null;
      if (!signer) {
        throw new Error('Signer is not available.');
      }

      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: encryptedBalance,
          contractAddress: CUSDT_ADDRESS,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [CUSDT_ADDRESS];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays,
      );

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decryptedValue = result[encryptedBalance as string] ?? '0';
      const normalized = typeof decryptedValue === 'bigint' ? decryptedValue : BigInt(decryptedValue);
      setDecryptedBalance(formatUnits(normalized, decimals));
    } catch (error) {
      console.error('Decrypt failed:', error);
      setDecryptError(error instanceof Error ? error.message : 'Failed to decrypt balance.');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <main className="swap-app">
      <section className="hero">
        <div className="hero-copy">
          <h2>Swap ETH for encrypted cUSDT in a single flow.</h2>
          <p>
            Your balance stays confidential on-chain. The Relayer lets you decrypt only when you ask for it.
          </p>
          <div className="hero-tags">
            <span>Fixed rate - 1 ETH = 2300 cUSDT</span>
            <span>cUSDT decimals: {decimals}</span>
            <span>FHE-ready</span>
          </div>
        </div>
        <div className="hero-panel">
          <div>
            <p className="panel-label">Network</p>
            <p className="panel-value">Sepolia Testnet</p>
          </div>
          <div>
            <p className="panel-label">Swap Contract</p>
            <p className="panel-mono">{SWAP_ADDRESS}</p>
          </div>
          <div>
            <p className="panel-label">cUSDT Contract</p>
            <p className="panel-mono">{CUSDT_ADDRESS}</p>
          </div>
        </div>
      </section>

      <section className="card-grid">
        <div className="card">
          <h3>Swap ETH -&gt; cUSDT</h3>
          <p className="card-subtitle">Pay ETH, receive confidential cUSDT instantly.</p>

          <label className="field-label" htmlFor="ethAmount">ETH amount</label>
          <div className="field-row">
            <input
              id="ethAmount"
              className="field-input"
              type="text"
              inputMode="decimal"
              placeholder="0.25"
              value={ethAmount}
              onChange={(event) => setEthAmount(event.target.value)}
            />
            <span className="field-suffix">ETH</span>
          </div>

          <div className="quote-row">
            <span>Estimated cUSDT</span>
            <strong>{formattedQuote}</strong>
          </div>

          <button
            className="primary-button"
            onClick={handleSwap}
            disabled={!isConnected || !parsedEth || !isSwapReady}
          >
            Swap for cUSDT
          </button>

          {swapStatus && <p className="status success">{swapStatus}</p>}
          {swapError && <p className="status error">{swapError}</p>}
        </div>

        <div className="card">
          <h3>Confidential Balance</h3>
          <p className="card-subtitle">Encrypted handle on-chain, clear balance only for you.</p>

          <div className="balance-row">
            <span>Encrypted handle</span>
            <span className="mono">
              {encryptedHandleLabel}
            </span>
          </div>

          <div className="balance-row">
            <span>Decrypted balance</span>
            <span className="balance-value">{decryptedBalance ?? '***.******'}</span>
          </div>

          <button
            className="secondary-button"
            onClick={handleDecrypt}
            disabled={!isConnected || isDecrypting || isZamaLoading || !encryptedBalance}
          >
            {isDecrypting ? 'Decrypting...' : 'Decrypt balance'}
          </button>

          {decryptError && <p className="status error">{decryptError}</p>}
          {zamaError && <p className="status error">{zamaError}</p>}
          {isZamaLoading && <p className="status muted">Encryption service loading...</p>}
        </div>
      </section>

      <section className="info-strip">
        <div>
          <h4>Privacy note</h4>
          <p>
            The balance handle stays encrypted in the contract. Decryption happens client-side through the
            Zama Relayer after you sign an EIP-712 request.
          </p>
        </div>
        <div>
          <h4>Required setup</h4>
          <p>
            Deploy the contracts on Sepolia and paste the addresses into the config to enable live swaps.
          </p>
        </div>
      </section>
    </main>
  );
}
