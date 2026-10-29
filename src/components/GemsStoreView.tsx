import React from 'react';
import { Gem, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { STANDARD_GIFTS } from '../utils/streamLogic';

interface GemsStoreViewProps {
  userGems: number;
  onLockedAttempt: () => void;
}

const GEM_PACKAGES = [
  { id: 'pack-100', amount: 100, bonus: 'Starter Pack', priceLabel: 'LKR 450' },
  { id: 'pack-500', amount: 500, bonus: '+50 Bonus Gems', priceLabel: 'LKR 1,950' },
  { id: 'pack-1200', amount: 1200, bonus: '+200 Bonus Gems', priceLabel: 'LKR 4,200' },
  { id: 'pack-3000', amount: 3000, bonus: 'Best Value • +600 Bonus', priceLabel: 'LKR 9,500' },
];

export const GemsStoreView: React.FC<GemsStoreViewProps> = ({ userGems, onLockedAttempt }) => {
  return (
    <div className="p-4 max-w-xl mx-auto space-y-5 pb-24">
      {/* Balance Header Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-[#131318] to-[#131318] border border-amber-500/30 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Your Wallet Balance
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-extrabold text-white">{userGems}</span>
            <span className="text-xs font-semibold text-amber-400">Available Gems</span>
          </div>
          <p className="text-xs text-zinc-400">
            Use Gems in any Watch Room live chat to send standard gifts to creators.
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
          <Gem className="w-7 h-7 text-amber-400" />
        </div>
      </div>

      {/* Maintenance Notice Banner */}
      <div className="p-4 rounded-2xl bg-[#131318] border border-amber-500/30 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              Coming Soon — Payment Gateway Under Maintenance
            </h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Direct Gem top-ups are temporarily locked while our regional payment gateway is under scheduled maintenance. You can still use your starter Gems in any stream chat.
          </p>
        </div>
      </div>

      {/* Locked Packages Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Gem Top-Up Packages (Locked)
          </h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
            <Lock className="w-3 h-3 text-[#e11d48]" />
            Purchases Disabled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GEM_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              onClick={onLockedAttempt}
              className="relative group rounded-2xl bg-[#131318] border border-white/[0.08] p-4 overflow-hidden cursor-not-allowed select-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Gem className="w-5 h-5 text-amber-400/70" />
                  </div>
                  <div>
                    <p className="text-base font-mono font-extrabold text-white">
                      {pkg.amount.toLocaleString()} Gems
                    </p>
                    <p className="text-[11px] text-amber-400/80 font-medium">{pkg.bonus}</p>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#e11d48]" />
                  <span>{pkg.priceLabel}</span>
                </div>
              </div>

              {/* Locked Overlay Badge */}
              <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1 text-zinc-400">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Locked • Coming Soon
                </span>
                <span>Payment Gateway Under Maintenance</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standard Gifts Reference */}
      <div className="p-4 rounded-2xl bg-[#131318] border border-white/[0.08] space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Available Stream Gifts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {STANDARD_GIFTS.map((g) => (
            <div
              key={g.id}
              className="p-2.5 rounded-xl bg-[#0b0b0e] border border-white/[0.06] flex flex-col items-center text-center"
            >
              <span className="text-xl">{g.emoji}</span>
              <span className="text-xs font-bold text-white mt-1">{g.name}</span>
              <span className="text-[11px] font-mono text-amber-400 mt-0.5">{g.cost} Gems</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
