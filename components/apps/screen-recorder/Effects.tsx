import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type EffectStrategy = 'webgl' | 'cpu' | 'passthrough';

interface EffectsProps {
    stream: MediaStream | null;
    onStreamReady: (
        stream: MediaStream | null,
        info: { usingEffects: boolean; strategy: EffectStrategy; blurStrength: number }
    ) => void;
    initialBlur?: number;
    autoEnable?: boolean;
}

interface WebGLResources {
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    positionBuffer: WebGLBuffer;
    texCoordBuffer: WebGLBuffer;
    texture: WebGLTexture;
    uniforms: {
        resolution: WebGLUniformLocation | null;
        blurStrength: WebGLUniformLocation | null;
    };
    attributes: {
        position: number;
        texCoord: number;
    };
}

type BlurContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

interface CpuResources {
    ctx: CanvasRenderingContext2D;
    blurCanvas: HTMLCanvasElement | OffscreenCanvas;
    blurCtx: BlurContext;
}

const DEFAULT_BLUR = 0.35;
const MAX_CANVAS_FPS = 30;

export const supportsWebGL = (canvas: HTMLCanvasElement): boolean => {
    if (typeof WebGLRenderingContext === 'undefined') {
        return false;
    }
    try {
        const gl =
            canvas.getContext('webgl', { preserveDrawingBuffer: false }) ||
            canvas.getContext('experimental-webgl', { preserveDrawingBuffer: false });
        return gl instanceof WebGLRenderingContext;
    } catch {
        return false;
    }
};

const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error('Failed to create shader');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compilation failed: ${info ?? 'unknown error'}`);
    }
    return shader;
};

const createProgram = (gl: WebGLRenderingContext, vertexSrc: string, fragmentSrc: string): WebGLProgram => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    const program = gl.createProgram();
    if (!program) {
        throw new Error('Failed to create program');
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        throw new Error(`Program link failed: ${info ?? 'unknown error'}`);
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
};

const createWebGLResources = (canvas: HTMLCanvasElement): WebGLResources | null => {
    if (!supportsWebGL(canvas)) {
        return null;
    }
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
    if (!gl) {
        return null;
    }

    const vertexSrc = `
        attribute vec2 aPosition;
        attribute vec2 aTexCoord;
        varying vec2 vTexCoord;
        void main() {
            vTexCoord = aTexCoord;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    const fragmentSrc = `
        precision mediump float;
        varying vec2 vTexCoord;
        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        uniform float uBlurStrength;

        vec4 blur(vec2 uv) {
            vec2 texel = 1.0 / uResolution;
            float radius = uBlurStrength * 6.0;
            vec4 sum = vec4(0.0);
            float count = 0.0;
            for (float x = -2.0; x <= 2.0; x += 1.0) {
                for (float y = -2.0; y <= 2.0; y += 1.0) {
                    vec2 offset = vec2(x, y) * texel * radius;
                    sum += texture2D(uTexture, uv + offset);
                    count += 1.0;
                }
            }
            return sum / count;
        }

        void main() {
            vec4 color = texture2D(uTexture, vTexCoord);
            vec4 background = blur(vTexCoord);
            float distanceFromCenter = distance(vTexCoord, vec2(0.5, 0.55));
            float feather = clamp(uBlurStrength * 0.35 + 0.15, 0.1, 0.45);
            float mask = smoothstep(0.35 + feather, 0.65, distanceFromCenter);
            gl_FragColor = mix(color, background, mask);
        }
    `;

    const program = createProgram(gl, vertexSrc, fragmentSrc);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!positionBuffer || !texCoordBuffer || !texture) {
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1,
        ]),
        gl.STATIC_DRAW
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ]),
        gl.STATIC_DRAW
    );

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const positionLoc = gl.getAttribLocation(program, 'aPosition');
    const texCoordLoc = gl.getAttribLocation(program, 'aTexCoord');
    const resolutionLoc = gl.getUniformLocation(program, 'uResolution');
    const blurLoc = gl.getUniformLocation(program, 'uBlurStrength');

    return {
        gl,
        program,
        positionBuffer,
        texCoordBuffer,
        texture,
        uniforms: {
            resolution: resolutionLoc,
            blurStrength: blurLoc,
        },
        attributes: {
            position: positionLoc,
            texCoord: texCoordLoc,
        },
    };
};

const createCpuResources = (canvas: HTMLCanvasElement): CpuResources | null => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return null;
    }

    const blurCanvas: HTMLCanvasElement | OffscreenCanvas = 'OffscreenCanvas' in window
        ? new OffscreenCanvas(canvas.width || 1, canvas.height || 1)
        : document.createElement('canvas');

    const blurCtx = 'getContext' in blurCanvas ? blurCanvas.getContext('2d') : null;

    if (!blurCtx) {
        return null;
    }

    return {
        ctx,
        blurCanvas,
        blurCtx,
    };
};

const ensureVideo = (stream: MediaStream): HTMLVideoElement => {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    const playPromise = video.play();
    if (typeof playPromise?.catch === 'function') {
        playPromise.catch(() => {
            // browsers may block autoplay; ignore silently.
        });
    }
    return video;
};

const drawCpu = (
    resources: CpuResources,
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    blurStrength: number,
    enableEffects: boolean
) => {
    const { ctx, blurCanvas, blurCtx } = resources;
    const width = canvas.width;
    const height = canvas.height;

    if (blurCanvas instanceof HTMLCanvasElement) {
        blurCanvas.width = width;
        blurCanvas.height = height;
    } else if (typeof OffscreenCanvas !== 'undefined' && blurCanvas instanceof OffscreenCanvas) {
        blurCanvas.width = width;
        blurCanvas.height = height;
    }

    (blurCtx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D).save?.();
    blurCtx.filter = enableEffects ? `blur(${Math.max(blurStrength * 25, 0)}px)` : 'none';
    blurCtx.clearRect(0, 0, width, height);
    blurCtx.drawImage(video, 0, 0, width, height);
    blurCtx.restore?.();

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    if (enableEffects) {
        ctx.drawImage(blurCanvas as CanvasImageSource, 0, 0, width, height);
        ctx.beginPath();
        const radiusX = width * (0.25 + blurStrength * 0.15);
        const radiusY = height * (0.35 + blurStrength * 0.15);
        ctx.ellipse(width / 2, height * 0.55, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.filter = 'none';
        ctx.drawImage(video, 0, 0, width, height);
    } else {
        ctx.drawImage(video, 0, 0, width, height);
    }
    ctx.restore();
};

const drawWebGL = (
    resources: WebGLResources,
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    blurStrength: number,
    enableEffects: boolean
) => {
    const { gl, program, positionBuffer, texCoordBuffer, texture, uniforms, attributes } = resources;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(attributes.texCoord);
    gl.vertexAttribPointer(attributes.texCoord, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    if (uniforms.resolution) {
        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    }
    if (uniforms.blurStrength) {
        gl.uniform1f(uniforms.blurStrength, enableEffects ? blurStrength : 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

const disposeWebGL = (resources: WebGLResources | null) => {
    if (!resources) return;
    const { gl, program, positionBuffer, texCoordBuffer, texture } = resources;
    gl.deleteProgram(program);
    gl.deleteBuffer(positionBuffer);
    gl.deleteBuffer(texCoordBuffer);
    gl.deleteTexture(texture);
};

const Effects: React.FC<EffectsProps> = ({
    stream,
    onStreamReady,
    initialBlur = DEFAULT_BLUR,
    autoEnable = true,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const frameHandleRef = useRef<number>();
    const processorRef = useRef<WebGLResources | CpuResources | null>(null);
    const strategyRef = useRef<EffectStrategy>('passthrough');
    const outputStreamRef = useRef<MediaStream | null>(null);
    const latestSettings = useRef({ enableEffects: autoEnable, blur: initialBlur, reduceMotion: false });

    const [enableEffects, setEnableEffects] = useState(autoEnable);
    const [blurStrength, setBlurStrength] = useState(initialBlur);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [strategy, setStrategy] = useState<EffectStrategy>('passthrough');

    latestSettings.current = { enableEffects, blur: blurStrength, reduceMotion };

    const handleReduceMotion = useCallback((event: MediaQueryList | MediaQueryListEvent) => {
        const prefersReduce = event.matches;
        setReduceMotion(prefersReduce);
        if (prefersReduce) {
            setEnableEffects(false);
        } else if (autoEnable) {
            setEnableEffects(true);
        }
    }, [autoEnable]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        handleReduceMotion(query);
        const listener = (event: MediaQueryListEvent) => handleReduceMotion(event);
        if (query.addEventListener) {
            query.addEventListener('change', listener);
        } else {
            // Safari
            query.addListener(listener);
        }
        return () => {
            if (query.removeEventListener) {
                query.removeEventListener('change', listener);
            } else {
                query.removeListener(listener);
            }
        };
    }, [handleReduceMotion]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!stream || !canvas) {
            onStreamReady(null, { usingEffects: false, strategy: 'passthrough', blurStrength: latestSettings.current.blur });
            return undefined;
        }

        const video = ensureVideo(stream);
        videoRef.current = video;

        const ready = () => {
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;

            if (outputStreamRef.current == null) {
                const captured = canvas.captureStream(MAX_CANVAS_FPS);
                outputStreamRef.current = captured;
                const current = latestSettings.current;
                onStreamReady(captured, {
                    usingEffects: current.enableEffects && !current.reduceMotion,
                    strategy: strategyRef.current,
                    blurStrength: current.blur,
                });
            }

            const tryInitProcessor = () => {
                if (latestSettings.current.reduceMotion) {
                    strategyRef.current = 'passthrough';
                    processorRef.current = null;
                    setStrategy('passthrough');
                    return;
                }

                const webglResources = createWebGLResources(canvas);
                if (webglResources) {
                    processorRef.current = webglResources;
                    strategyRef.current = 'webgl';
                    setStrategy('webgl');
                    return;
                }

                const cpuResources = createCpuResources(canvas);
                if (cpuResources) {
                    processorRef.current = cpuResources;
                    strategyRef.current = 'cpu';
                    setStrategy('cpu');
                    return;
                }

                processorRef.current = null;
                strategyRef.current = 'passthrough';
                setStrategy('passthrough');
            };

            tryInitProcessor();

            const renderFrame = () => {
                const settings = latestSettings.current;
                const shouldApplyEffects = settings.enableEffects && !settings.reduceMotion;
                const resources = processorRef.current;
                if (!resources) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    }
                } else if ('gl' in resources) {
                    drawWebGL(resources as WebGLResources, video, canvas, settings.blur, shouldApplyEffects);
                } else {
                    drawCpu(resources as CpuResources, video, canvas, settings.blur, shouldApplyEffects);
                }

                frameHandleRef.current = ('requestVideoFrameCallback' in video
                    ? (video as any).requestVideoFrameCallback(renderFrame)
                    : requestAnimationFrame(renderFrame));
            };

            if (video.readyState >= 2) {
                renderFrame();
            } else {
                video.addEventListener('loadeddata', renderFrame, { once: true });
            }
        };

        if (video.readyState >= 2) {
            ready();
        } else {
            const onLoaded = () => ready();
            video.addEventListener('loadedmetadata', onLoaded, { once: true });
        }

        return () => {
            if (frameHandleRef.current) {
                if (video && 'cancelVideoFrameCallback' in video) {
                    (video as any).cancelVideoFrameCallback(frameHandleRef.current);
                } else {
                    cancelAnimationFrame(frameHandleRef.current);
                }
            }
            if (video) {
                const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
                if (!userAgent.includes('jsdom') && typeof video.pause === 'function') {
                    try {
                        video.pause();
                    } catch {
                        // Some environments (like automated tests) do not implement pause.
                    }
                }
                video.srcObject = null;
            }
            if (processorRef.current && 'gl' in (processorRef.current as any)) {
                disposeWebGL(processorRef.current as WebGLResources);
            }
            if (outputStreamRef.current) {
                outputStreamRef.current.getTracks().forEach((track) => track.stop());
                outputStreamRef.current = null;
            }
            processorRef.current = null;
            strategyRef.current = 'passthrough';
            setStrategy('passthrough');
        };
    }, [stream, onStreamReady]);

    useEffect(() => {
        const output = outputStreamRef.current;
        if (!output) return;
        onStreamReady(output, {
            usingEffects: enableEffects && !reduceMotion,
            strategy: strategyRef.current,
            blurStrength,
        });
    }, [enableEffects, blurStrength, reduceMotion, onStreamReady]);

    useEffect(() => {
        return () => {
            const output = outputStreamRef.current;
            if (output) {
                output.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const toggleEffects = useCallback(() => {
        if (reduceMotion) {
            setEnableEffects(false);
            return;
        }
        setEnableEffects((prev) => !prev);
    }, [reduceMotion]);

    const onBlurInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value);
        setBlurStrength(value);
    }, []);

    const statusLabel = useMemo(() => {
        if (reduceMotion) {
            return 'Effects disabled due to reduced motion preference';
        }
        if (strategy === 'webgl') {
            return 'WebGL segmentation active';
        }
        if (strategy === 'cpu') {
            return 'CPU fallback active';
        }
        return 'Passthrough preview';
    }, [reduceMotion, strategy]);

    return (
        <div className="w-full space-y-3">
            <div className="relative w-full bg-black rounded border border-ub-cool-grey overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full aspect-video"
                    role="img"
                    aria-label="Screen capture preview with optional background segmentation"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-xs px-2 py-1 rounded">
                    {statusLabel}
                </div>
            </div>
            <div className="flex items-center justify-between text-sm text-ub-light-grey">
                <span className="font-semibold">Background effects</span>
                <button
                    type="button"
                    onClick={toggleEffects}
                    disabled={reduceMotion}
                    aria-pressed={enableEffects && !reduceMotion}
                    aria-label={enableEffects && !reduceMotion ? 'Disable background effects' : 'Enable background effects'}
                    className={`px-3 py-1 rounded border transition-colors ${
                        enableEffects && !reduceMotion
                            ? 'bg-ub-dracula border-ub-dracula text-white'
                            : 'bg-transparent border-ub-cool-grey text-ub-light-grey'
                    } ${reduceMotion ? 'opacity-50 cursor-not-allowed' : 'hover:border-white'}`}
                >
                    {enableEffects && !reduceMotion ? 'On' : 'Off'}
                </button>
            </div>
            <label className="block text-xs uppercase tracking-wide text-ub-light-grey" htmlFor="screen-recorder-blur">
                Blur strength
                <input
                    id="screen-recorder-blur"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={blurStrength}
                    onChange={onBlurInput}
                    disabled={reduceMotion}
                    aria-label="Blur strength"
                    className="mt-1 w-full accent-ub-dracula"
                />
            </label>
        </div>
    );
};

export default Effects;
