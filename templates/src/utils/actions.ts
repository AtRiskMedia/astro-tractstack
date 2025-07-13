/* eslint-disable @typescript-eslint/no-explicit-any */

const DOUBLEQUOTE = [`"`];
const BRACKETLEFT = `(`;
const BRACKETRIGHT = `)`;
const SEMICOLON = `;`;
const NEWLINE = `\n`;
const WHITESPACE = [` `, `\n`, `\t`];

type LispToken = string | number | LispToken[];

export function lispLexer(
  payload: string = ``,
  inString: boolean = false
): [LispToken[], string] {
  const tokens: LispToken[] = [];
  let curToken = ``;

  for (let i = 0; i < payload.length; i++) {
    const char = payload.charAt(i);
    if (DOUBLEQUOTE.includes(char) && inString === false) {
      const [tokenized, remaining] = lispLexer(payload.substring(i + 1), true);
      tokens.push(tokenized);
      payload = remaining;
      i = -1;
    } else if (DOUBLEQUOTE.includes(char)) {
      if (curToken.length) {
        tokens.push(+curToken || curToken);
      }
      return [tokens, payload.substring(i + 1)];
    } else if (char === BRACKETLEFT) {
      const [tokenized, remaining] = lispLexer(payload.substring(i + 1));
      tokens.push(tokenized);
      payload = remaining;
      i = -1;
    } else if (char === BRACKETRIGHT) {
      if (curToken.length) {
        tokens.push(+curToken || curToken);
      }
      return [tokens, payload.substring(i + 1)];
    } else if (char === SEMICOLON) {
      // skip comments
      while (payload.charAt(i) !== NEWLINE) {
        i++;
      }
    } else if (WHITESPACE.includes(char) && inString !== true) {
      if (curToken.length) {
        tokens.push(+curToken || curToken);
      }
      curToken = ``;
    } else {
      curToken += char;
    }
  }
  return [tokens, ``];
}

interface BrandConfig {
  HOME_SLUG: string;
  [key: string]: any;
}

export const preParseAction = (
  payload: any,
  slug: string,
  isContext: boolean,
  brandConfig: BrandConfig
) => {
  const thisPayload = (payload && payload[0]) || false;
  const command = (thisPayload && thisPayload[0] && thisPayload[0][0]) || null;
  const parameters =
    (thisPayload && thisPayload[0] && thisPayload[0][1]) || null;
  const parameterOne = (parameters && parameters[0]) || null;
  const parameterTwo = (parameters && parameters[1]) || null;
  const parameterThree = (parameters && parameters[2]) || null;

  switch (command) {
    case `goto`:
      switch (parameterOne) {
        case `storykeep`:
          if (parameterTwo) {
            switch (parameterTwo) {
              case `dashboard`:
                return `/storykeep`;
              case `settings`:
                return `/storykeep/settings`;
              case `login`:
                return `/storykeep/login?force=true`;
              case `logout`:
                return `/storykeep/logout`;
              default:
                console.log(`LispActionPayload preParse misfire`, payload);
            }
          }
          if (!isContext) return `/${slug}/edit`;
          return `/context/${slug}/edit`;
        case `home`:
          return `/`;
        case `concierge`:
          return `/concierge/${parameterTwo}`;
        case `context`:
          return `/context/${parameterTwo}`;
        case `storyFragment`:
          if (parameterTwo !== brandConfig?.HOME_SLUG)
            return `/${parameterTwo}`;
          return `/`;
        case `storyFragmentPane`:
          if (parameterTwo && parameterThree) {
            if (parameterTwo !== brandConfig?.HOME_SLUG)
              return `/${parameterTwo}#${parameterThree}`;
            return `/#${parameterThree}`;
          }
          console.log(
            `LispActionPayload preParse misfire on goto storyFragmentPane`,
            parameterTwo,
            parameterThree
          );
          break;
        case `bunny`:
          if (parameterTwo && parameterThree)
            return `/${parameterTwo}?t=${parameterThree}s`;
          return null;
        case `url`:
          return parameterTwo;
        case `sandbox`:
          if (parameterTwo) {
            switch (parameterTwo) {
              case `claim`:
                return `/sandbox/claim`;
            }
          }
          return ``;
        default:
          console.log(`LispActionPayload preParse misfire on goto`, payload);
      }
      break;
    default:
      console.log(`LispActionPayload preParse misfire`, payload);
      break;
  }
  return ``;
};
