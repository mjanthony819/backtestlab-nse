const H = ({ children }: { children: React.ReactNode }) => <h2 className="cap !text-blue mt-10 mb-3">{children}</h2>;

export default function About() {
  return (
    <div className="pt-6 max-w-[760px] text-body leading-7">
      <h1 className="font-doto text-[34px] font-bold text-ink leading-none mb-4">Method</h1>
      <p>BacktestLab replays simple rules on past NSE prices and shows what they would have done, with costs. It is built to be hard to fool yourself with. Here is exactly what it assumes.</p>

      <H>How a backtest runs</H>
      <ul className="list-disc pl-5 space-y-2">
        <li>The strategy sees prices up to the close of day <b>t</b> and decides: invested or in cash.</li>
        <li>The trade fills at the <b>open of day t+1</b>. No same-bar fills. A test in the repo changes the future and checks that no earlier position moves.</li>
        <li>Indicators are warmed up on history before your start date, but the first day of the window starts in cash.</li>
        <li>One stock, long or flat, fully invested when long. No leverage, no shorting.</li>
        <li>Idle cash earns nothing in the equity curve. Sharpe subtracts a 6.5% annual risk-free rate, so a strategy that sits in cash looks worse than it feels. That is deliberate.</li>
        <li>The Sharpe interval comes from a 1000-draw circular block bootstrap (20-day blocks). Wide intervals are the norm. Most rule-based edges are inside the noise.</li>
      </ul>

      <H>Costs</H>
      <p>A flat percentage is charged on each buy and each sell. The default is 0.10% per side. Real costs vary: STT on delivery trades is 0.1% on both sides, plus brokerage, exchange charges, GST and stamp duty. Many discount brokers charge zero brokerage on delivery, so 0.10% to 0.25% per side is a more honest range for delivery. Intraday would cost less in STT but this tool does not model intraday. Slippage on large orders is not modelled. Use the cost slider to stress it.</p>

      <H>Strategies</H>
      <ul className="list-disc pl-5 space-y-2">
        <li><b>SMA crossover</b>: invested while the fast average is above the slow average.</li>
        <li><b>RSI mean reversion</b>: buy when RSI drops below the entry level, sell when it rises above the exit level.</li>
        <li><b>Momentum (12-1)</b>: invested while the return from 12 months ago to 1 month ago is positive.</li>
        <li><b>Bollinger reversion</b>: buy a close below the lower band, sell a close above the middle band.</li>
        <li><b>Buy and hold</b>: the baseline. Pays the same entry cost.</li>
      </ul>

      <H>Data and its limits</H>
      <ul className="list-disc pl-5 space-y-2">
        <li>Prices come from <b>Yahoo Finance</b>, which is unofficial. It can rate-limit, change or be wrong without notice.</li>
        <li>Prices are split and dividend <b>adjusted</b>, so returns include dividends but are not point-in-time. Past opens and closes are not the numbers printed on the day.</li>
        <li>About 50 large Nifty stocks are refreshed nightly into a cache. Any other NSE symbol is fetched live and may be slow or fail.</li>
        <li><b>Survivorship bias:</b> the list is today&apos;s large caps. Companies that fell out of the index or went bust are missing, so results for the list as a whole look better than a real investor&apos;s would have. Picking a stock because it did well is the same trap in a smaller form.</li>
        <li>Taxes (STCG/LTCG), circuit limits, liquidity and corporate-action quirks are ignored.</li>
      </ul>

      <H>Reading the result</H>
      <p>If a strategy beats buy and hold on one stock over one period, that is an anecdote. Try other stocks and other windows. If a parameter setting only works at one exact value, it is overfit. Try neighbours.</p>

      <div className="box p-4 mt-10 text-dim text-[12px]">
        <span className="cap !text-amber mr-3">not advice</span>
        This is an educational project. Nothing here is investment advice or a recommendation to buy or sell anything. Backtests are hypothetical and past performance does not predict future results.
      </div>
      <p className="mt-6 text-faint text-[12px]">Source and engine tests: <a className="text-blue" href="https://github.com/mjanthony819/backtestlab-nse">github.com/mjanthony819/backtestlab-nse</a>. The engine grew out of the research project <a className="text-blue" href="https://github.com/mjanthony819/nse-ml-backtest">nse-ml-backtest</a>.</p>
    </div>
  );
}
