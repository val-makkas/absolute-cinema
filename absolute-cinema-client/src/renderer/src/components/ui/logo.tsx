import logoImage from '@/assets/logo_trans.png'

export default function Logo({ w, h, abs}: { w:number, h:number, abs:boolean}): React.ReactElement {
  
  return (
    abs ? (
      // When abs is true
      <div className="absolute w-14 h-14">
          <div className="absolute inset-0 rounded-full flex items-center justify-center">
            {/* This div contains just the gradient on the logo shape */}
            <div
              className={`w-${w} h-${h} p-1`}
              style={{
                backgroundImage: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                WebkitMaskImage: `url(${logoImage})`,
                WebkitMaskSize: 'contain',
                WebkitMaskPosition: 'center',
                WebkitMaskRepeat: 'no-repeat',
                maskImage: `url(${logoImage})`,
                maskSize: 'contain',
                maskPosition: 'center',
                maskRepeat: 'no-repeat'
              }}
            ></div>
          </div>

          {/* Animated gradient version for hover */}
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div
              className={`w-${w} h-${h} p-1 animate-gradient-slow`}
              style={{
                backgroundImage: 'linear-gradient(135deg, #a855f7, #3b82f6, #8b5cf6, #3b82f6)',
                backgroundSize: '300% 300%',
                WebkitMaskImage: `url(${logoImage})`,
                WebkitMaskSize: 'contain',
                WebkitMaskPosition: 'center',
                WebkitMaskRepeat: 'no-repeat',
                maskImage: `url(${logoImage})`,
                maskSize: 'contain',
                maskPosition: 'center',
                maskRepeat: 'no-repeat'
              }}
            ></div>
          </div>
        </div>
    ) : (
      // When abs is false
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full flex items-center justify-center">
          {/* This div contains just the gradient on the logo shape */}
          <div
            className={`w-${w} h-${h} p-1`}
            style={{
              backgroundImage: 'linear-gradient(135deg, #a855f7, #3b82f6)',
              WebkitMaskImage: `url(${logoImage})`,
              WebkitMaskSize: 'contain',
              WebkitMaskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskImage: `url(${logoImage})`,
              maskSize: 'contain',
              maskPosition: 'center',
              maskRepeat: 'no-repeat'
            }}
          ></div>
        </div>

        {/* Animated gradient version for hover */}
        <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div
            className={`w-${w} h-${h} p-1 animate-gradient-slow`}
            style={{
              backgroundImage: 'linear-gradient(135deg, #a855f7, #3b82f6, #8b5cf6, #3b82f6)',
              backgroundSize: '300% 300%',
              WebkitMaskImage: `url(${logoImage})`,
              WebkitMaskSize: 'contain',
              WebkitMaskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskImage: `url(${logoImage})`,
              maskSize: 'contain',
              maskPosition: 'center',
              maskRepeat: 'no-repeat'
            }}
          ></div>
        </div>
      </div>
    )
  );
}