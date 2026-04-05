const fs = require('fs');
let content = fs.readFileSync('components/home-view.tsx', 'utf-8');

// Import
content = content.replace("import { cn } from '@/lib/utils'", "import { cn } from '@/lib/utils'\nimport { AnimatedContainer, AnimatedItem } from '@/components/ui/animated-view'");

// Change wrapper
content = content.replace(
  '<div className="flex min-h-screen flex-col px-4 pb-24 pt-0">',
  '<AnimatedContainer className="flex min-h-screen flex-col px-4 pb-24 pt-0">'
);

// We need to replace the last closing div of the wrapper
let lastDivIndex = content.lastIndexOf('</div>\n  )\n}');
content = content.substring(0, lastDivIndex) + '</AnimatedContainer>' + content.substring(lastDivIndex + 6);

// Wrap children
content = content.replace(
  '{hasSubscription ? (',
  '<AnimatedItem>\n        {hasSubscription ? ('
).replace(
  '      )}',
  '      )}\n      </AnimatedItem>'
);

content = content.replace(
  '      {/* Quick Actions */}\n      <div className="mb-5 grid grid-cols-2 gap-3">',
  '      {/* Quick Actions */}\n      <AnimatedItem className="mb-5 grid grid-cols-2 gap-3">'
).replace(
  '        </button>\n      </div>',
  '        </button>\n      </AnimatedItem>'
);

content = content.replace(
  '      {/* Referral Banner */}\n      <button',
  '      {/* Referral Banner */}\n      <AnimatedItem>\n      <button'
).replace(
  '        </div>\n      </button>',
  '        </div>\n      </button>\n      </AnimatedItem>'
);

content = content.replace(
  '      {/* VPN Router Store Banner */}\n      {(user.role === \'admin\' || user.role === \'owner\') && (\n        <button',
  '      {/* VPN Router Store Banner */}\n      {(user.role === \'admin\' || user.role === \'owner\') && (\n        <AnimatedItem>\n        <button'
).replace(
  '          </div>\n        </button>\n      )}',
  '          </div>\n        </button>\n        </AnimatedItem>\n      )}'
);

content = content.replace(
  '      {/* Locations & Checks — unified section */}\n      <div className="relative mb-5 overflow-hidden rounded-[28px]',
  '      {/* Locations & Checks — unified section */}\n      <AnimatedItem className="relative mb-5 overflow-hidden rounded-[28px]'
).replace(
  '          </div>\n        )}\n      </div>',
  '          </div>\n        )}\n      </AnimatedItem>'
);

content = content.replace(
  '      {/* Legal Footer Links */}\n      <div className="mt-6 pb-6">',
  '      {/* Legal Footer Links */}\n      <AnimatedItem className="mt-6 pb-6">'
).replace(
  '        </button>\n      </div>\n\n    </AnimatedContainer>',
  '        </button>\n      </AnimatedItem>\n\n    </AnimatedContainer>'
);

fs.writeFileSync('components/home-view.tsx', content);
