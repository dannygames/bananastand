ffmpeg \
 -loop 1 -t 0.5 -i 1.PNG \
 -loop 1 -t 0.5 -i 2.PNG \
 -loop 1 -t 0.5 -i 3.PNG \
 -filter_complex "
  [0:v]format=yuva444p,fade=t=out:st=0.5:d=0.5:alpha=1,setpts=PTS-STARTPTS[v0];
  [1:v]format=yuva444p,fade=t=in:st=0:d=0.5:alpha=1,fade=t=out:st=0.5:d=0.5:alpha=1,setpts=PTS-STARTPTS+0.5/TB[v1];
  [2:v]format=yuva444p,fade=t=in:st=0:d=0.5:alpha=1,setpts=PTS-STARTPTS+1.0/TB[v2];
  [v0][v1]overlay[ov1];
  [ov1][v2]overlay,format=yuv420p[v]
 " -map "[v]" -t 2.0 output.mp4
