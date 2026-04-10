import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useVision } from '../hooks/useVision'
import { PathShader } from '../shaders/PathShader'
import { FloorShader } from '../shaders/floorShader'
import { initAudio, playSpatialAlert, startNavigationTone, stopNavigationTone, playNavigationCue } from '../hooks/SpatialAudio'
import { ESCAPE_GAME } from '../hooks/EscapeLogic'
import { PuzzleUI } from './PuzzleUI'

const BASE_SPEED = 0.04
const TURN_SENSITIVITY = 0.005

const MAX_YAW_STEP = 0.02
const STABILITY_THRESHOLD = 0.02

const Scene = ({ setStatus, setRiddlePanel, currentPuzzleIdx, setGridObstacles }: any) => {
  const { camera, gl } = useThree()
  const { getObstacles, scanMarker, ready, getObstacleZones } = useVision()

  const yaw = useRef(0)
  const targetYaw = useRef(0)

  const lastNavDirection = useRef<string | null>(null)
  const lastCueTime = useRef(0)

  const touchX = useRef<number | null>(null)
  const playerPos = useRef(new THREE.Vector3(0, 1.6, 0))

  const nodesRef = useRef<any[]>([])
  const obstaclesRef = useRef<any[]>([])
  const prevObstaclesRef = useRef<any[]>([])

  const pathMaterials = useRef<any[]>([])

  const markerConfidence = useRef(0)
  const markerLocked = useRef(false)
  const hasStarted = useRef(false)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchX.current = e.touches[0].clientX
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (touchX.current === null) return
      const dx = e.touches[0].clientX - touchX.current
      touchX.current = e.touches[0].clientX
      targetYaw.current -= dx * TURN_SENSITIVITY
    }

    const handleTouchEnd = () => (touchX.current = null)

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)

    gl.setClearColor(0x000000, 0)

    const unlockAudio = () => {
      initAudio()
      document.body.removeEventListener('touchstart', unlockAudio)
    }
    document.body.addEventListener('touchstart', unlockAudio, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      stopNavigationTone()
    }
  }, [])

  const stabilize = (value: number, prev: number) => {
    const delta = value - prev
    if (Math.abs(delta) < STABILITY_THRESHOLD) return prev
    return prev + delta * 0.15
  }

  useFrame((state) => {
    const delta = state.clock.getDelta()

    const yawDiff = targetYaw.current - yaw.current
    const clamped = THREE.MathUtils.clamp(yawDiff, -MAX_YAW_STEP, MAX_YAW_STEP)
    yaw.current += clamped * 0.8
    camera.rotation.set(0, yaw.current, 0)

    const forward = new THREE.Vector3(
      Math.sin(yaw.current),
      0,
      -Math.cos(yaw.current)
    )

    const raw = getObstacles() || []

    obstaclesRef.current = raw.map((o, i) => {
      const prev = prevObstaclesRef.current[i]

      const stableX = prev ? stabilize(o.x, prev.x) : o.x
      const stableZ = prev ? stabilize(o.z, prev.z) : o.z

      const local = new THREE.Vector3(stableX, 0, stableZ)

      return {
        pos: local
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current)
          .add(playerPos.current),
        label: o.label,
        x: stableX,
        z: stableZ
      }
    })

    prevObstaclesRef.current = obstaclesRef.current

    if (setGridObstacles) {
      setGridObstacles(
        obstaclesRef.current.map(o => ({
          x: o.x,
          z: o.z
        }))
      )
    }

    const zones = getObstacleZones()

    let bias = (zones.right - zones.left)
    const centerWeight = zones.center * 1.5

    let steerStrength = bias - centerWeight * Math.sign(bias || 1)

    if (zones.center > 3) {
      steerStrength += (zones.left < zones.right ? -1 : 1) * 1.5
    }

    steerStrength = THREE.MathUtils.clamp(steerStrength * 0.015, -0.05, 0.05)
    targetYaw.current += steerStrength

    let navDirection: 'left' | 'right' | 'forward' = 'forward'
    if (steerStrength < -0.01) navDirection = 'left'
    else if (steerStrength > 0.01) navDirection = 'right'

    const dangerAhead = zones.center > 1
    const speed = dangerAhead ? 0.02 : BASE_SPEED

    playerPos.current.add(forward.clone().multiplyScalar(speed))
    camera.position.copy(playerPos.current)

    if (navDirection !== lastNavDirection.current) {
      startNavigationTone(navDirection)
      lastNavDirection.current = navDirection
    }

    if (state.clock.elapsedTime - lastCueTime.current > 2) {
      playNavigationCue(navDirection)
      lastCueTime.current = state.clock.elapsedTime
    }

    if (dangerAhead && state.clock.elapsedTime % 1.5 < 0.02) {
      const closest = obstaclesRef.current[0]
      if (closest) {
        playSpatialAlert(closest.pos, 0.3, true)
      }
    }

    const nodes = []
    for (let i = 1; i <= 10; i++) {
      const pos = playerPos.current.clone().add(
        forward.clone().multiplyScalar(i * 0.8)
      )

      const isDanger = obstaclesRef.current.some(o =>
        o.pos.distanceTo(pos) < 1.2
      )

      nodes.push({ pos, isDanger })
    }
    nodesRef.current = nodes

    pathMaterials.current.forEach((mat) => {
      if (mat) mat.uniforms.uTime.value = state.clock.elapsedTime
    })

    setStatus(!ready ? 'scanning' : dangerAhead ? 'warning' : 'active')

    const detected = scanMarker()

    if (detected) {
      hasStarted.current = true
      markerConfidence.current += delta * 2
    } else {
      markerConfidence.current -= delta * 3
    }

    markerConfidence.current = THREE.MathUtils.clamp(markerConfidence.current, 0, 1)

    if (markerConfidence.current > 0.8) {
      markerLocked.current = true
    }

    const target = ESCAPE_GAME.puzzles[currentPuzzleIdx]
    const targetVec = new THREE.Vector3(target.targetPos.x, 0, target.targetPos.z)

    const distance = playerPos.current.distanceTo(targetVec)

    if (
      hasStarted.current &&
      distance < 1.2 &&
      markerLocked.current &&
      markerConfidence.current > 0.9
    ) {
      playSpatialAlert(new THREE.Vector3(0, 0, -1), 0.5, false)
      setRiddlePanel(true)

      markerLocked.current = false
      markerConfidence.current = 0
    }
  })

  const showMarkerVisual = markerConfidence.current > 0.6

  return (
    <>
      <ambientLight intensity={1.5} />

      {/* 🔥 ENHANCED AR GRID */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          camera.position.x,
          camera.position.y - 1.4,
          camera.position.z - 2.5
        ]}
      >
        <planeGeometry args={[8, 8]} />
        <shaderMaterial args={[FloorShader]} transparent />
      </mesh>

      {/* 🔥 MARKER LOCK VISUAL */}
      {showMarkerVisual && (
        <mesh position={[
          camera.position.x,
          camera.position.y,
          camera.position.z - 1.5
        ]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshBasicMaterial color="cyan" transparent opacity={0.8} />
        </mesh>
      )}

      {nodesRef.current.map((n, i) => {
        const material = new THREE.ShaderMaterial({
          ...PathShader,
          uniforms: {
            ...PathShader.uniforms,
            uColor: { value: new THREE.Color(n.isDanger ? 0xff4444 : 0x00ffff) }
          },
          transparent: true
        })

        pathMaterials.current[i] = material

        return (
          <group key={i}>
            <mesh position={n.pos} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.6, 0.6]} />
              <primitive object={material} attach="material" />
            </mesh>

            <mesh position={[n.pos.x, n.pos.y + 0.3, n.pos.z]}>
              <cylinderGeometry args={[0.05, 0.05, 0.5]} />
              <meshBasicMaterial 
                color={n.isDanger ? 'red' : 'cyan'} 
                transparent 
                opacity={0.8} 
              />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

export default function ARScene({ setStatus, setGridObstacles }: any) {
  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState(0)
  const [riddlePanel, setRiddlePanel] = useState(false)

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {riddlePanel && (
        <PuzzleUI
          puzzle={ESCAPE_GAME.puzzles[currentPuzzleIdx]}
          onSolve={() => {
            setRiddlePanel(false)
            setCurrentPuzzleIdx(p => p + 1)
          }}
        />
      )}

      <Canvas camera={{ position: [0, 1.6, 0], fov: 75 }} gl={{ alpha: true }}>
        <Scene
          setStatus={setStatus}
          setRiddlePanel={setRiddlePanel}
          currentPuzzleIdx={currentPuzzleIdx}
          setGridObstacles={setGridObstacles}
        />
      </Canvas>
    </div>
  )
}