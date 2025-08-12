import { Parser } from 'expr-eval';

const parser = new Parser({
    operators: {
        add: true,
        concatenate: true,
        conditional: true,
        divide: true,
        factorial: true,
        multiply: true,
        power: true,
        remainder: true,
        subtract: true,
        logical: false,
        comparison: false,
        in: false,
        assignment: true,
    },
});

export function evaluateExpression(command, variables = {}) {
    let result = "";
    let expr;
    try {
        expr = parser.parse(command);
        try {
            result = parser.evaluate(command, variables);
            if (expr.tokens.length === 2 && expr.tokens[2].type === "IOP2") {
                variables[expr.variables()[0]] = result;
            }
        } catch (e) {
            result = e.message;
        }
    } catch (e) {
        result = "Invalid Expression";
    }
    return result;
}

export const HELP_TEXT = [
"Available Commands:",
"Operators:",
" addition ( + ), subtraction ( - ),",
"multiplication ( * ),",
"division ( / ),",
"modulo ( % )exponentiation. ( ^ )",
"",
"Mathematical functions:",
"abs[x] : Absolute value (magnitude) of x",
"acos[x] : Arc cosine of x (in radians)",
"acosh[x] : Hyperbolic arc cosine of x (in radians)",
"asin[x] : Arc sine of x (in radians)",
"asinh[x] : Hyperbolic arc sine of x (in radians)",
"atan[x] : Arc tangent of x (in radians)",
"atanh[x] : Hyperbolic arc tangent of x (in radians)",
"cbrt[x] : Cube root of x",
"ceil[x] : Ceiling of x — the smallest integer that’s >= x",
"cos[x] : Cosine of x (x is in radians)",
"cosh[x] : Hyperbolic cosine of x (x is in radians)",
"exp[x] : e^x (exponential/antilogarithm function with base e)",
"floor[x] : Floor of x — the largest integer that’s <= x",
"ln[x] : Natural logarithm of x",
"log[x] : Natural logarithm of x (synonym for ln, not base-10)",
"log10[x] :  Base-10 logarithm of x",
"log2[x] : Base-2 logarithm of x",
"round[x] :       X, rounded to the nearest integer",
"sign[x] : Sign of x (-1, 0, or 1 for negative, zero, or positive respectively)",
"sin[x] : Sine of x (x is in radians)",
"sinh[x] : Hyperbolic sine of x (x is in radians)",
"sqrt[x] : Square root of x. Result is NaN (Not a Number) if x is negative.",
"tan[x] : Tangent of x (x is in radians)",
"tanh[x] : Hyperbolic tangent of x (x is in radians)",
"",
"",
"Pre-defined functions:",
"random(n) : Get a random number in the range [0, n). If n is zero, or not provided, it defaults to 1.",
"fac(n)        n! : (factorial of n: \"n * (n-1) * (n-2) * … *2 * 1\") Deprecated. Use the ! operator instead.",
"min(a,b,…) : Get the smallest (minimum) number in the list.",
"max(a,b,…) : Get the largest (maximum) number in the list.",
"hypot(a,b) : Hypotenuse, i.e. the square root of the sum of squares of its arguments.",
"pyt(a, b) : Alias for hypot.",
"pow(x, y) : Equivalent to x^y.",
"roundTo(x, n) : Rounds x to n places after the decimal point.",
"",
"Constants: ",
"E : The value of Math.E from your JavaScript runtime.",
"PI : The value of Math.PI from your JavaScript runtime.",
"",
"Variable assignments : ",
"declare variable and assign a value: x=1  declared variable can be used in further calculation x+2.",
"",
"clear command for clearing calculator app.",
"",
"exit command for exit from calculator app."
].join('\n');

export function navigateHistory(history, index, direction) {
    if (direction === "up") {
        const cmd = index <= -1 ? "" : history[index] ?? "";
        return { cmd, index: index - 1 };
    }
    if (direction === "down") {
        if (index >= history.length) {
            return { cmd: null, index };
        }
        if (index <= -1) index = 0;
        const cmd = index === history.length ? "" : history[index] ?? "";
        return { cmd, index: index + 1 };
    }
    return { cmd: null, index };
}
