import { useEffect, useState } from "react";
import { useAudio } from "../../../components/common/useSoundManager.js";
import socket from "../../../server/server.js";
import "../../../styles/songSheet.css";
import { setInput } from "../../../redux/actions/inputActions";

const staticColorsArray = ["250,0,255", "1,248,10", "0,248,203", "249,41,42"];
let myInstrument;

const audioPlayer = document.getElementById("audioPlayer");

if (!audioPlayer) {
  console.error("Audio player not found");
}

const playAudio = async (sound) => {
  try {
    audioPlayer.src = sound;
    audioPlayer.currentTime = 0;
    audioPlayer.volume = 0;
    await audioPlayer.play();
    // console.log("Audio started successfully");
  } catch (error) {
    console.error("Error playing audio:", error);
  }
};

export const StartTuto = ({ stime, data, railRefs, send, myPosition, roomCode }) => {

  const animationDuration = 6000;
  const { playBGM, currentBGM, playMotionSFX } = useAudio();
  const processedNotes = new Set();
  let notes = data?.musicData?.notes || [];

  useEffect(() => {
    if (railRefs[myPosition]) {
      myInstrument = railRefs[myPosition].current?.dataset.instrument;
    }
  }, [railRefs, myPosition]);

  useEffect(() => {
    let audioTime;
    let bgmTimeout;
    const lastPart = data?.musicData?.sound?.split('/').pop();

    if (notes?.length > 0) {
      bgmTimeout = setTimeout(() => {
        playAudio(data.musicData.sound);
        // playAudio("/song/0.wav");
        playBGM(lastPart, { loop: false, volume: 0.85 });
        // playBGM("0.wav", { loop: false, volume: 0.85 });

        WhenStart();
      }, stime);
    }

    const WhenStart = () => {
      let count = 1200;

      const ScheduleNotes = () => {
        audioTime = parseInt(audioPlayer.currentTime * 1000, 10);

        notes.forEach(note => {
          const startTime = note.time - animationDuration;

          if (startTime <= audioTime && !processedNotes.has(note)) {
            processedNotes.add(note);
            GenerateNote(note);
          }
        });

        requestAnimationFrame(ScheduleNotes);
      };

      requestAnimationFrame(ScheduleNotes);
    };

    const GenerateNote = (note) => {
      const { motion, time } = note;

      const noteElement = document.createElement("div");
      noteElement.style.left = `120%`;
      noteElement.className = "Note";
      noteElement.style.zIndex = time;
      noteElement.textContent = motion === "A" ? "L" : "R";
      noteElement.setAttribute("data-motion", motion);
      noteElement.setAttribute("data-time", time + 460);
      noteElement.setAttribute("data-instrument", note.instrument);
      noteElement.setAttribute("data-index", time);

      // console.log("RAILREFS 갯수: ", railRefs);
      // console.log("My Inst: ", myInstrument);
      railRefs.forEach((railRef, index) => {
        if (railRef.current && railRef.current.dataset.instrument === note.instrument) {
          noteElement.key = index;
          noteElement.style.backgroundColor = `rgb(${staticColorsArray[index]})`;
          // console.log(noteElement.key);
          railRef.current.appendChild(noteElement);
        }
      });

      const AnimateNote = () => {
        const currTime = parseInt(audioPlayer.currentTime * 1000, 10);
        const positionPercent = ((time + 460 - currTime) * 100 / animationDuration).toFixed(1);

        if (positionPercent <= -3) {
          noteElement.remove();
          cancelAnimationFrame(AnimateNote);
        } else {
          noteElement.style.left = `${positionPercent}%`;
          requestAnimationFrame(AnimateNote);
        }
      };

      requestAnimationFrame(AnimateNote);
    };

    const End = () => {
      // console.log("게임 종료");

      const sendData = {
        score: sessionStorage.getItem("hitNote"),
        nickname: sessionStorage.getItem("nickname"),
        code: roomCode,
      };

      socket.emit("gameEnded", sendData);
      sessionStorage.removeItem("hitNote");
      sessionStorage.removeItem("combo");
    };

    const handleAudioEnded = () => {
      End();
    };

    if (audioPlayer) {
      audioPlayer.addEventListener('ended', handleAudioEnded);
    }

    if (currentBGM?.source && currentBGM?.source.playbackState !== "running") {
      WhenStart();
    }

    return () => {
      clearTimeout(bgmTimeout);
      if (currentBGM?.source) {
        currentBGM.source.stop();
      }
      if (audioPlayer) {
        audioPlayer.removeEventListener('ended', handleAudioEnded);
      }
    };
  }, [data.musicData, railRefs, roomCode, notes]);
  return null;
};

export default StartTuto;