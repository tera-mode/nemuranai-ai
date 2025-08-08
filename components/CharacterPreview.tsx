'use client';

interface CharacterPreviewProps {
  character: {
    name: string;
    race: string;
    personality: string;
    domain: string;
    appearance: {
      hairColor: string;
      eyeColor: string;
      outfit: string;
      accessories: string[];
    };
    backstory: string;
  };
}

export function CharacterPreview({ character }: CharacterPreviewProps) {
  const getRaceEmoji = (race: string) => {
    const raceEmojis: Record<string, string> = {
      dragon: '🐲',
      elf: '🧝‍♀️',
      android: '🤖',
      ghost: '👻',
      mage: '🧙‍♀️',
      genius: '👶'
    };
    return raceEmojis[race] || '👤';
  };

  const getDomainEmoji = (domain: string) => {
    const domainEmojis: Record<string, string> = {
      sales: '💼',
      marketing: '📱',
      support: '🛡️',
      analysis: '📊',
      secretary: '📋',
      strategy: '🎯'
    };
    return domainEmojis[domain] || '💼';
  };

  const getPersonalityDescription = (personality: string) => {
    const descriptions: Record<string, string> = {
      tsundere: '「べ、別にあなたのためじゃないんだからね！」',
      kuudere: '「...ふん。まあ、手伝ってあげてもいいわ」',
      genki: '「がんばりましょー！一緒にお仕事しましょうね♪」',
      serious: '「承知いたしました。責任を持って対応させていただきます」',
      mysterious: '「...興味深いですね。お手伝いしましょうか」',
      innocent: '「わあ！お役に立てるように頑張ります！」'
    };
    return descriptions[personality] || 'よろしくお願いします';
  };

  const getRandomStats = () => {
    return {
      efficiency: Math.floor(Math.random() * 20) + 70,
      creativity: Math.floor(Math.random() * 20) + 70,
      empathy: Math.floor(Math.random() * 20) + 70,
      accuracy: Math.floor(Math.random() * 20) + 70,
    };
  };

  const stats = getRandomStats();

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">プレビュー</h2>
      
      {/* キャラクターカード */}
      <div className="bg-gradient-to-br from-white/20 to-white/5 rounded-xl p-6 mb-6">
        {/* アバター部分 */}
        <div className="text-center mb-4">
          <div className="text-8xl mb-4">
            {getRaceEmoji(character.race)}
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {character.name || 'AI社員'}
          </h3>
          <div className="flex items-center justify-center gap-2 text-white/80">
            <span className="text-lg">{getDomainEmoji(character.domain)}</span>
            <span>{character.domain || 'general'}専門</span>
          </div>
        </div>

        {/* 外見情報 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-white/60 text-xs mb-1">髪の色</div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-white/30"
                style={{ backgroundColor: character.appearance.hairColor }}
              />
              <span className="text-white text-sm">{character.appearance.hairColor}</span>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-white/60 text-xs mb-1">瞳の色</div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-white/30"
                style={{ backgroundColor: character.appearance.eyeColor }}
              />
              <span className="text-white text-sm">{character.appearance.eyeColor}</span>
            </div>
          </div>
        </div>

        {/* セリフ */}
        <div className="bg-white/10 rounded-lg p-4 mb-4">
          <div className="text-white/60 text-xs mb-2">キャラクターの一言</div>
          <div className="text-white italic">
            &ldquo;{getPersonalityDescription(character.personality)}&rdquo;
          </div>
        </div>

        {/* 能力値 */}
        <div className="space-y-3">
          <div className="text-white font-medium text-sm mb-2">能力値</div>
          {[
            { label: '効率性', value: stats.efficiency, color: 'bg-blue-500' },
            { label: '創造性', value: stats.creativity, color: 'bg-purple-500' },
            { label: '共感力', value: stats.empathy, color: 'bg-pink-500' },
            { label: '正確性', value: stats.accuracy, color: 'bg-green-500' },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="flex justify-between text-white/80 text-sm">
                <span>{stat.label}</span>
                <span>{stat.value}/100</span>
              </div>
              <div className="bg-white/20 rounded-full h-2">
                <div
                  className={`${stat.color} h-full rounded-full transition-all duration-500`}
                  style={{ width: `${stat.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* バックストーリー */}
      {character.backstory && (
        <div className="bg-white/10 rounded-lg p-4">
          <div className="text-white font-medium text-sm mb-2">バックストーリー</div>
          <div className="text-white/80 text-sm">
            {character.backstory}
          </div>
        </div>
      )}
    </div>
  );
}