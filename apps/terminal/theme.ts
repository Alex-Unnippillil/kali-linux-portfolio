export const DRAGON = `
              __/\\__
   .-\\      .-"      "-.
  /   \\   .'            '.
 /      \\ /                \\
;        Y                  ;
|         \\                 |
|          '-.___________.-'
;                   |
 \\      .--.       /
  '.__.'    '.__.'
`;

export function getMotdLines(): string[] {
  const info = [
    `Platform: ${navigator.platform}`,
    `User Agent: ${navigator.userAgent}`,
  ];
  return [...DRAGON.trimEnd().split('\n'), '', ...info];
}
