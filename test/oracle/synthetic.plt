# Synthetic oracle corpus: structure derived from a real-world stress file.
# All identifiers, strings, and numbers are synthetic. Runtime-clean under
# gnuplot 6.0.4 except the single line marked INTENTIONALLY INVALID.
set terminal svg size 640,360
set print $DATA_A
print "0 0.62\n1 1.44\n2 2.31\n3 1.18\n\n\n0 0.35\n1 0.71\n2 1.02\n3 1.48"
unset print
specv = "$DATA_A"
p $DATA_A i 1 u 1:($2*5) w l lw 2 lc rgb "#2a6b9f" t "series one",\
  specv u 1:(0):(0):(4) w vec nohead lc rgb 'black' not
set print "syn_ser_001.dat"
do for [i=1:6] { print sprintf("%d %.3f %.3f %.2f", i, i*0.7, sin(i*0.4)+2, 0.8) }
unset print
set print "syn_ser_002.dat"
do for [i=1:6] { print sprintf("%d %.3f %.3f %.2f", i, i*0.9, cos(i*0.4)+2, 0.6) }
unset print
set print "syn_tab.tsv"
print "colA\tcolB\tcolC\tcolD\tcolE"
do for [i=1:20] { print sprintf("%d\t%.3f\t%.3f\t%d\t%d", i, i*0.5, sin(i*0.3)+2, i%6+1, i%4+1) }
unset print
set print "syn_inc.gp"
print "set style line 21 lw 2"
unset print
system "perl -e 'print pack(q(C), int(rand(256))) for 1..192' > syn_img.bin"
set table $DATA_B
plot [1:30] '+' u 1:(8+8*sin($1/4)):(1+0.5*rand(0)) with table
unset table
set table $DATA_C
plot [1:12] '+' u 1:(sin($1)+2):(sin($1)+1):(sin($1)+4):(sin($1)+3):(sin($1)+2.5) with table
unset table
set table $FITD
plot [0:5] '+' u 1:($1*2+1+0.1*sin($1*7)) with table
unset table
set print $CSV_A
print "1,2.5,0.3\n2,3.5,0.4\n3,4.5,0.5\n4,5.5,0.6"
unset print
set print $SPARSE_A
print "1 1 3.5\n2 3 1.5\n3 2 4.5\n4 4 2.0"
unset print
set print $HIST_A
print "m1 e1 m2 e2\n1 0.2 2 0.3\n2 0.3 3 0.2\n3 0.1 2 0.4"
unset print
set print $CURVE_A
print "0 0\n1 0.5\n1.5 1.5\n0.5 2\n-0.5 1"
unset print
set print $HULL_A
print "1 1\n2 2.4\n3 1.2\n2.5 3.1\n\n\n4 1\n5 2.2\n6 1.4\n5.5 2.8"
unset print
set print $MULTI_A
print "1 2 3\n2 3 4\n\n\n1 3 4\n2 4 5\n\n\n1 4 5\n2 5 6\n\n\n1 5 6\n2 6 7\n\n\n1 6 7\n2 7 8\n\n\n1 7 8\n2 8 9"
unset print
set print $LBV_A
print "1 2 alpha 1 45\n2 3 beta 2 90\n3 1 gamma 3 0"
unset print
set print $POLY_A
print "0 0 0\n1 0 0\n0 1 0\n\n1 0 0\n0 1 0\n0 0 1"
unset print
set print $TIME_A
print "1/3/24 12:00 5\n2/3/24 12:00 7\n3/3/24 12:00 6"
unset print
myfn1(x)=sin(x)+1
myfn2(x)=cos(x)+1-x+pi
myfn3(x)=tan(x)
set fit nolog cov err maxiter default quiet
set paxis 4 label "axis label one" font "SynthSerif, 10"
set paxis 6 label font "SynthSerif" "axis label two" textcolor lt -1 norotate
set paxis 7 range [0.00000:100.000]  noextend
set paxis 1 tics axis in scale 1,0.5 nomirror norotate  autojustify
set paxis 1 tics norangelimit autofreq font "SynthSerif,9"
set style textbox  opaque margins 0.5,  0.5 fc  bgnd noborder linewidth  1.0
set format '%.2t*10^%+03T'
kamp=1
myfour(k,x) = kamp*sin(3./2*k)/k * 2./3*cos(k*x)
set logscale xyz 2
se  log cb
unset logscale
set dataf miss NaN
set dataf sep whitespace

myfn4(x)=x
plot sin(x), [t=-3:25:1] '+' using (t):(myfn4(t))
plot for [dfile in "syn_ser_001.dat syn_ser_002.dat"] dfile
splot '++' using 1:2:(sin($1)*sin($2)) with pm3d
plot '++' using 1:2:(sin($1)*sin($2)) with image
set timefmt "%d/%m/%y %H:%M"
set xdata time
plot ["1/3/24 00:00":"3/3/24 23:00"] $TIME_A using 1:3
set xdata

myfn5(x)=2*x+1
plot [0:10] myfn1(x), [10:20] myfn3(x), [20:30] myfn5(x)
xcol = 1; ycol = 2
plot specv using xcol:ycol convexhull
plot $DATA_B using 1:2:3:3 zsort with points lc palette
set title "3D sampling range distinct from plot x/y range"
splot sample [u=30:70][v=0:50] '++' using 1:2:(u*v) lt 3, \
[u=40:80][v=30:60] '++' using (u):(v):(u*sqrt(v)) lt 4

show plot
pause 0 "$0"
pause 0 "s"
strv = "SYNPAUSE"
pause 0.05 strv

varname = 1
# Edge case for valid identifier
γ1=1

lblno = 2
argstr = "synthetic arg"
if(varname == 1){
  set label lblno argstr at 0.5,1.5 textcolor lt 1
  print "\n", argstr, " at ", 0.5, 1.5
  replot; refresh
}else{
  lblno = lblno+1
  print "\n"
}

if (strstrt(GPVAL_TERMINALS, " windows ") == 0) {
  fontspec = "SynthSans,12"
} else {
  fontspec = "SynthAlt,12"
}
SYNTH_FIGURES = 1

if (!exists("synhelp")) synhelp = 0
if (synhelp > 0) {
  if (strstrt(GPVAL_TERMINALS, " svg ") > 0) {
    set term svg font fontspec size 448,225 dynamic fontscale 0.6
  } else {
    set term dumb size 79,24 enhanced
  }
    out = "./winout/"
} else if (GPVAL_TERM eq "dumb") {
  set term svg font 'SynthSerif,14' size 600,400
  out = "./htmlout/"
} else if (GPVAL_TERM eq "domterm") {
  set term svg fontscale 0.75 size 600, 420
  out = "./"
} else {
  set term svg mouse standalone font fontspec size 640,400
  out = "./"
}
fontspec = "SynthSerif, 15"
set loadpath "syn_path_a"
set loadpath '../syn_demo'

if (GPVAL_TERM eq "svg" || GPVAL_TERM eq "dumb") ext=".svg"
set margin
set encoding utf8 # utf8 body follows
set offset 10,10,4,2
set xzeroaxis
set lmargin screen 0.05
plot $DATA_B u 1:($2-10.) title 'with lines' with lines
set output out . 'figure_points' . ext
plot $DATA_B u 1:($2-10.):(1+rand(0)) title 'with points ps variable' \
with points ps variable pt 6
set output out . 'figure_linespoints' . ext
set key opaque height 1
myfn1(x) = 8 + 8 * sin(x/20)
plot $DATA_B u 1:($2-10.) title 'with linespoints' \
with linespoints pt 6 ps 1, \
'' u 1:($2) title 'pointinterval -2' with lp pt 4 ps 1 pi -2, \
'' u 1:($2+10.) with lp pt "β" pi -1 font ",18" title 'with lp pt "β" pi -1'
set style fill solid 0.25 noborder
plot $DATA_B u 1:($2-10.) title 'with fillsteps' with fillsteps above y=10, \
               '' u 1:($2-10.) title 'with steps' with steps lw 3 dt solid, \
               '' u 1:($2-10.) with points pt 7 ps 0.5 lc "black" title 'data points'
set output out . 'figure_candlesticks' . ext
p $DATA_C u 1:3:2:6:5 title 'with candlesticks' with candlesticks whiskerbar fs solid 0.5 fc "cyan"
set bars 4
plot $DATA_C using 1:3:2:6:5 title 'with financebars' with financebars
plot $DATA_C u 1:2:3:4:5 with ellipses units xy title "with ellipses",\
     '' u 1:2:3:4:5 with ellipses units xx notitle,\
     '' u 1:2:3:4:5 with ellipses units yy notitle
reset
set st ellipse size screen 1, graph 2,1 angle 10 units xx noclip
set st ellipse angle 10 size screen 1, graph 2,1 units yy noclip
set title 'A single annular sector in plot style "with sectors"' offset -2,-1
set arrow 1 from 6,0 to 9,0
set arrow 1 heads size screen 0.015, 30, 90 filled front lw 1 lc rgb "gray30"
set arrow 2 from polar 28, 9.7 to polar 62, 9.7
set arrow 2 heads size screen 0.015, 30, 90 filled front lw 1 lc rgb "gray30"

if (GPVAL_TERM eq "svg") \
  set term svg font fontspec size 620,380 dynamic
if (GPVAL_TERM eq "domterm") \
  set term svg fontscale 0.75 size 600, 420
$HM_A << EOD
7 3 2 1 0
1 2 0 0 2
0 0 1 1 0
0 1 3 4 2
2 2 1 0 1
EOD
set palette rgbformulae -3,-3,-3
plot $HM_A matrix with image pixels
set title "Synthetic heatmap composed of sectors "\
          ."positioned on a cartesian x/y plane"
set title offset 0,-1

rmaxv = 10; drv = 0.5
tmaxv = 180; dtv = 10

fsec(t,r) = r*cos(t+20*r)**2
set angle degrees
set theta top cw
set xrange [-(rmaxv+2):(rmaxv+2)]
set yrange [-(rmaxv+2):(rmaxv+2)]
set size ratio -1
set palette viridis
set colorbox user size 0.05, 0.6 origin 0.85,0.15
set table $TBL_R
splot sample [t=0:tmaxv-dtv:dtv] [r=0:rmaxv-drv:drv] "++" u (t):(r):(0)
unset table
plot $TBL_R u 1:2:(dtv):(drv):(0.5):(0):(fsec($1+dtv/2,$2+drv/2)) w sectors fc palette fs solid, \
     $TBL_R u (-$1):2:(-dtv):(drv):(-0.5):(0):(fsec($1+dtv/2,$2+drv/2)) w sectors fc palette fill solid
set view 69, 200, 1.18, 1.00
set bmargin at screen 0.3
set samples 20, 20
set isosamples 21, 21
set xlabel "X axis" rotate parallel offset 0,-1
set zlabel  offset 2,0 rotate by -90
set hidden3d offset 1
splot sin(x) * cos(y) with lines lt -1
set contour base
set cntrparam levels auto 9
set style textbox opaque noborder margins 0.25,0.25
set cntrlabel font ",8"
splot sin(x) * cos(y), sin(x) * cos(y) with labels boxed
set style fill   solid 1.00 border
set grid xtics ytics ztics
set grid vertical layerdefault lt 0 lw 1, lt 0 lw 1
set wall z0 fc rgb "slategrey" fillstyle transparent solid 0.50 border lt -1
set view 59, 24, 1, 1
set xyplane at 0
set xtics 1; set xtics add ("" 0, "" 11)
set ytics add ("" 0, "" 6)
set pm3d depthorder base
set pm3d interpolate 1,1 border lw 1.000 dashtype solid
set pm3d lighting primary 0.5 specular 0.2 spec2 0
rgbf(x) = int(x*51*16384 + (12-x)*51*64 + abs(6.5-x)*510/9.)
tstr(n) = sprintf("%d",n)
set boxwidth 0.4 abs
splot for [col=1:5] $DATA_C using 1:(col):(col*column(col)):(rgbf($1)) with boxes fc rgb variable
set format z "%.1f"
splot 'syn_img.bin' binary array=(8,8) flipy format='%uchar%uchar%uchar' with rgbimage
set t svg dynamic
set label 1 center at graph 0.75,0.1 "Transit Hub One"
set tics scale 0
set x2tics ("Alpha Town" 1, "Beta City" 2, "Gamma Port" 3, "Delta Bay" 4)
set palette defined (0 "#CCCCDD", 0.3 "goldenrod", 0.6 "salmon", 1.0 "dark-green")
set palette maxcolors 6
set cbtics format "≈%g:"   add (" Zone " 42)
set auto noextend
plot $SPARSE_A sparse matrix=(4,4) origin=(1,1) with image
set key title "Synthetic Heights\nby District"
set xtics ("NW" 72.0, "E" 42.0, "Core" 12.0, "Edge" 122.0) scale 0.0
plot 'syn_img.bin' binary array=(8,8) format='%uchar%uchar%uchar' origin=(0,0)   dx=0.5 dy=1.5  with rgbimage notitle, \
     'syn_img.bin' binary array=(8,8) format='%uchar%uchar%uchar' origin=(60,0)  dx=0.5 dy=1    with rgbimage notitle, \
     'syn_img.bin' binary array=(8,8) format='%uchar%uchar%uchar' origin=(30,0)  dx=0.5 dy=0.7  with rgbimage notitle, \
     'syn_img.bin' binary array=(8,8) format='%uchar%uchar%uchar' origin=(110,0) dx=0.5 dy=0.35 with rgbimage notitle

myscale(size) = 0.33*sqrt(sqrt(column(size)))
myname(String,Size) = sprintf("{/=%d %s}", myscale(Size), stringcolumn(String))
set termoption enhanced
set termoption font "SynthSerif, 18"
set size square
set datafile separator "\t"
plot 'syn_tab.tsv' using 5:4:($3 < 2.2 ? "-" : myname(1,3)) with labels
set datafile separator whitespace
set style fill solid border lc "black"
set key outside right center reverse Left samplen 1
set key title "Outcomes" left
plot $HM_A matrix with image pixels notitle, \
  keyentry w boxes fc palette cb 0 title "no effect",\
  keyentry w boxes fc palette cb 1 title "threshold", \
  keyentry w boxes fc palette cb 3 title "typical range", \
  keyentry w labels title "as reported in [3]", \
  keyentry w boxes fc palette cb 5 title "strong effect"
set output out . 'figure_vectors' . ext
set label 1 "Vector field {/:Italic G(x,y) = (qy,-qx)}"
set label 1 at 0.5, 3.0 left
unset key
unset clip one
unset border
set style arrow 1 head filled  size .2, 20. lw 2 lc "slateblue1"
plot $DATA_B using 1:($2-$3):($2+$3) with filledcurves, \
  $DATA_B using 1:2 smooth mcs with lines
set samples 5, 5
set isosamples 5, 5
set size ratio 1 1
plot '++' using 1:2:($2*0.4):(-$1*0.4) with vectors as 1

break
shadec = "#c8e8c8"
plot $DATA_B u 1:($2+$3):($2-$3) w filledcurve fc rgb shadec title "Shaded error region", \
'' u 1:2 smooth mcspline lw 1.5  title "Monotonic spline through data"
set output out . 'figure_histclust' . ext
set style data histogram
set style histogram clustered
plot $HIST_A u 1 fs solid 0.5 t col, '' u 2 fs empty t col
set style histogram errorbars lw 2
plot $HIST_A u 2:3 fs solid 0.5 ti 'A', '' using 4:5 fs empty ti 'B'
set style histogram rows
set style histogram cluster
set style data histogram
unset title
set key auto column noinvert
set xtics 1 offset character 0,0.3
plot newhistogram "Set A", \
    $HIST_A u 1 t col, '' u 2 t col fs empty, \
    newhistogram "Set B" at 8, \
    $HIST_A u 1 t col, '' u 2 t col fs empty
set output out . 'figure_histcols' . ext
set style histogram columnstacked
set title "Columnstacked" offset 0,-1
set boxwidth 0.8 rel
set paxis 2 range [0:30]
set paxis 4 range [-1:15]
set paxis 4 tics  auto 1 left offset 5
set xtics
set style data parallelaxes
set for [i=1:4] paxis i range [*:*]
plot $DATA_B u 2:(int($0/10)) lt 1 lc variable, '' u 3, '' u 1, '' u ($3/2)
set auto y
plot $DATA_B u 1:2:($3+$1/50.) w filledcurves above title 'above' lc rgb "honeydew", \
'' u 1:2:($3+$1/50.) w filledcurves below title 'below' lc rgb "dark-violet", \
'' u 1:2 w lines lt -1 lw 1 title 'curve 1', \
'' u 1:($3+$1/50.) w l lt -1 lw 4 title 'curve 2'
set print $PTS_A
nptsv = 40
do for [i=1:nptsv] {
  print sprintf("%d %7.4g", (i%3) ? 2 : 5, 12.+4.*invnorm(rand(0)))
}
unset print
set multiplot layout 1, 2
set jitter over 0.5 spread 1.6 swarm
set title "swarm (default)"
plot $PTS_A using 1:2:1 with points pt 6 ps 0.8 lc variable
set jitter over 0.5 spread 1.6 square
set title "square"
replot
unset multiplot
plot for [i=0:1] $HULL_A i i w p ls (i+1), \
for [i=0:1] '' i i convexhull w filledcurve ls i+1
if (!strstrt(GPVAL_COMPILE_OPTIONS, "+CHI_SHAPES")){
  clear
  set output out.'figure_hull_two'. ext
  clear
} else {
  unset key
  unset tics; unset border
  set offsets graph 0, 0, graph 0.1, graph 0.1
  set style fill transparent solid 0.1 border
  set style line 2 lc "forest-green" pt 7 ps 0.5
  set xrange [-30:30]
  set yrange [-30:30]

  set title noenhanced offset 0, -2.0
  set multiplot layout 2,2 spacing 0 margins 0, 1, 0, 0.9 \
  title "synthetic hull" font ":Bold"

  chi_len = real("+Inf")
  set title "chi_len = +Inf  (convex hull)"

  plot $HULL_A index 0 with points ls 2 notitle,\
  '' index 0 concavehull with filledcurve ls 2 \
      title sprintf("chi_len = %.1f", chi_len)
  chi_len = 25.; set title sprintf("chi_len = %.1f", chi_len)
  replot
  chi_len = 20.; set title sprintf("chi_len = %.1f", chi_len)
  replot
  chi_len = 16.; set title sprintf("chi_len = %.1f", chi_len)
  replot
  unset multiplot

  set output out . 'figure_hull_three' . ext
  set style fill transparent solid 0.1 noborder
  set multiplot layout 2,2 spacing 0 margins 0, 1, 0, 0.9 \
  title "hull smooth path expand 3.0    " font ":Bold"
  chi_len = real("+Inf")
  set title "chi_len = +Inf  (convex hull)"
  plot $HULL_A index 0 with points ls 2 notitle
  unset multiplot
}
splot for [k=5:1:-1] $DATA_B using 1:(k):2:3 with zerror lt black fc lt k title "k = ".tstr(k)
set pm3d depthorder border linewidth 0.100
set pm3d clip z
set pm3d lighting primary 0.5 specular 0.2 spec2 0.4
set pm3d nolighting
set pm3d spotlight rgb "blue"

f(x,y) = x**2 + 0.5*y**2 * (2 - x)**3
set title "splot with pm3d, solid fillcolor" offset 0,1
splot f(x,y) with pm3d fc ls 5
set wall x0
set wall y1
set sample 21; set isosample 21
set tmargin 0; set bmargin 0
set pm3d interp 1,2 border lt -1 lw 0.5
sincf(u,v) = sin(sqrt(u**2+v**2)) / sqrt(u**2+v**2)
splot for [x=-2:2][y=-50:50:3] '+' using (x):($1/100.):(-1):(-1):(sincf($1/10., 1.+2*x)) with zerrorfill
unset hidden3d
set vgrid $VOX_A size 20
set vxrange [-2:2]
set vyrange [-2:2]
set vzrange [-2:2]
vfill "syn_ser_001.dat" using 1:2:3:4:(1 < 1 ? 1 : 1/0.9)
vfill sample [t=0:6.28] '+'  using (cos($1)):(sin($1)):(cos($1)*sin($1)):(0.9):(10.0)
splot $VOX_A with isosurface level 1.0 lt 3 notitle
unset vgrid $VOX_A
$SPID_A << EndOfData
	sc1     sc2     sc3     sc4     sc5
Alef	15      75      20      43      90
Bet	40	40	40	60	30
EndOfData
set datafile columnheaders
set style spiderplot fs transparent solid 0.2 border
set grid spiderplot
set spiderplot
set for [i=1:5] paxis i range [0:100]
set             paxis 1 tics font ',9'
set for [i=2:5] paxis i tics format ""
set key reverse at screen .9, .9
plot for [i=1:5] $SPID_A using i
unset spiderplot
unset datafile columnheaders
splot $POLY_A w polygons fs transparent solid 0.8 fc bgnd
set style fill transparent solid 0.2 border lt 8

# closed-path smoothing cluster
plot $CURVE_A smooth path w filledcurves closed title "smooth path with filledcurves closed", \
     $CURVE_A  smooth path w lines lt 8 title "smooth path with lines", \
     $CURVE_A w points pt 7 lc "steelblue" title "original points", \
     $CURVE_A  w points pt 7 lc "steelblue" notitle
reset
set output out.'figure_dgrid' . ext

$VOXD_A << EOD
0 0 10
0 1 vec[1]
0 2 10
1 0 sin(2.72)
1 2 10
1 sincf(pi) 5
2 2 10
EOD
set term svg background rgb "gray75"
ox0=0.1; oy0=0.1; ox1=0.6; oy1=0.5
set object 1 rectangle from ox0,oy0 to ox1,oy1 fillstyle solid fillcolor bgnd
unset key
set key opaque fillcolor background
set key opaque fillcolor bgnd
se  k   opaque fc        bgnd
se  k   opaque fc        pal frac 1
se  k   opaque fc        pal cb 1
set key textcolor variable
se  k   tc        var
se  k   tc lt 1
set dgrid3d 30,30 splines
set view 55, 76, 1.15, 0.9
set xyplane 0
set hidden3d
set title "Smooth surface fit to scattered points\nset dgrid3d 30,30 splines"
set title font ",14"
splot $VOXD_A u 1:2:3 w l title "wrapped \
      long title", $VOXD_A u 1:2:3 w p pt 7 ps 0.5 lc "black" nogrid
unset dgrid3d
unset hidden3d
set xtics ("0\nReal(w)" 0) left out nomirror scale 1.5 offset 0,-0.3
set ytics ("0\nImag(w)" 0) left out nomirror scale 1.5 offset 0,-0.3

if (GPVAL_TERM eq "domterm") {
  set ztics (50) format "syn E0" offset 6,1 scale 0
} else {
  set label "{/:Italic W_0(w)}" at graph 0,0,1.1
}
set palette model HSV start 0.3 defined (0 0 1 1, 1 1 1 1)
set pal defined (0 0 1 1, 1 1 1 1) model HSV start 0.3
set cbtics ("-π" -pi, "π" pi, "phase" 0) scale 0
set pm3d corners2color c1
iiv = {0,1}
myE(w) = sin(w) + w
splot '++' u 1:2:(abs(myE(x+iiv*y))):(arg(myE(x+iiv*y))) w pm3d
set table $MASK_A
splot sample [u=-2:2:0.4][v=-2:2:0.4] '++' u 1:2:(exp(-$1**2-$2**2))
unset table
set table $HULL_B
plot $MASK_A u 1:2 convexhull w l t "Convex hull"
unset table
set multiplot layout 1,2 spacing 0.0 margins 0.05,0.95,0.0,0.85
set title "Cluster of points\n defining the mask region"
splot  $MASK_A u 1:2:3 w pm3d, \
       '' u 1:2:(0) nogrid w p pt 7 ps .5 lc "black"
set pm3d interp 3,3
set title "pm3d surface masked by\nconvex hull of the cluster"
splot  $HULL_B using 1:2:(0) w mask, \
       $MASK_A u 1:2:3 mask w pm3d

unset multiplot

stats $HM_A matrix name "SMA" nooutput

if (!strstrt(GPVAL_COMPILE_OPTIONS, "+WATCHPOINTS")) {
  clear
} else {
  set tics nomirror
  set xrange noextend
  unset ytics
  set y2tics 0.25 format "%.2f"
  set link y2
  unset key
  set lmargin 10
  set grid y2

  set title "Find quartile values on a synthetic curve"

  set style watchpoint label offset 1,0.3 point pt 6 ps 1 noboxed textcolor "blue"
}

set output out.'figure_polar_grid' . ext

if (!strstrt(GPVAL_COMPILE_OPTIONS, "+POLARGRID")) {
  clear
} else {
  set size square
  set angle degrees
  unset border; unset tics; unset key; set tmargin 0
  unset colorbox
  set rrange [0:200]
  set rtics 50,50,200
  set grid polar front lt -1 lw 0.2 lc "gray50"
  set palette cubehelix negative gamma 0.8
  set polar grid gauss kdensity scale 35
  set polar grid theta [0:190] r [0:200]
  plot $DATA_B with surface, '' with points pt 7 lc "black" ps 0.5
  unset polar
}

set title "contourfill + contour lines" offset 0,-0.5
set bmargin at screen 0.01; set tmargin at screen 0.9
set xrange [-1:5]; set yrange [-3:3]; set zrange [-25:25]
set ztics -20, 5, 20
set cntrparam cubic levels incremental -20, 5, 20
set cntrlabel onecolor
set tics format ""
set palette viridis
set contour both
set contourfill auto 1
set contourfill ztics
set contourfill cbtics
set contourfill palette
set contourfill firstlinetype 1
set pm3d scansauto border retrace
myg(x,y) = x**2 + y**2 * (1 - x)**3
plot [t=1:10] [-pi:pi*2] tan(t), \
  $DATA_B using (tan($2)):($3/2) smooth csplines \
axes x1y2 notitle with lines
plot for [dfile in "syn_ser_001.dat syn_ser_002.dat"] dfile
plot 'syn_ser_001.dat' using 3:1, '' using 3:2
plot 'syn_tab.tsv' using (column("colA")):(column(1)), \
     ''            using (column("colA")):(column(2))
plot 'syn_tab.tsv' using "colA":"colB", '' using "colA":"colC"
plot $SPARSE_A sparse matrix=(4,4) origin=(1,1) with image
splot $HM_A matrix using (1+$1):(1+$2*10):3
p $DATA_A i 1 every 1:1:0:0:3 w lines

set tit "title" font "SynthSerif,14" tc lt -1 enhanced off 1,1

set colorbox border 1
splot f(x,y) using lines, f(x,y) using contourfill at base # INTENTIONALLY INVALID: permanent grammar ERROR (contourfill doc-defect shape); the only ERROR in this file
set zlab off char 1, 0, 0 font "" tc lt -1 norotate
set ylab off 1,1 norot font "" tc lt 1
set xlab norot enhanced
set ylab off 1,1 norotate
set zlab font "" norotate enhanced
set ylab font "" off 1,1 rot by pi/2 enhanced
set xlab off 1,1 font "" rot by pi   enhanced
set ylab off 1,1 font "" enhanced rot parallel
set zlab tc lt 1 font '' noenhanced rot parallel

set view equal xyz
set view azimuth 1
set pal cubehelix start 1 cycles 1 saturation 1
set pal model HSV start 1
set pal model RGB
set pal model CMY
set pal cubehelix start 1
set pal rgb 7,5,15
set pal def (0 0 0 0, 1 1 1 1)
set pal def (0 "white", 1 "dark-red")
set pal gamma 2

set cntrlabel format "%g" start 1 interval 2
set cntrparam levels auto 5 sorted firstlinetype 10
set contourfill auto 4 firstlinetype 10
set key maxcols auto maxrows auto
kwsv = 0.12; kwgv = 0.2; mrgv = 0.08
set key keywidth screen kwsv
set key keywidth graph kwgv
set lmargin at screen mrgv

set pm3d border retrace lw 2 ftriangles
set pm3d clip z border retrace lw 3

set st data spiderplot
set st spiderplot fs empty lw 2 ls 3 ps 3 pt 4
set st spiderplot lw 2 ls 3 ps 3 pt 4
p $DATA_A w lp lw 3 pt 2 ps 3
set style data lines
set link y2 via 2*y inverse y/2

set paxis 4 tics  auto 1 left offset 5
set xtics         auto 1 left offset 5

set timestamp font "SynthSerif, 14"
plot $SPARSE_A sparse matrix=(4,4) origin=(1,1) with image

set style textbox opaque noborder margins 0.25,0.25
splot 'syn_img.bin' binary array=(8,8) flipy format='%uchar%uchar%uchar' with rgbimage
splot x*x-y*y with pm3d, x*x+y*y with pm3d at t

set style data lines
if (strstrt(GPVAL_COMPILE_OPTIONS, "+WATCHPOINTS")) {
  plot $DATA_B u 1:2 w l axes x1y2 watch y=8
  plot $DATA_B u 1:2 w l watch y=4 label "4" watch y=12 label "12"
}
f(x,y) = 2*x - y      # a sloping plane through zero

set linetype 1 dt solid lw 1 lc rgb "black"
plot 'syn_img.bin' binary array=(8,8):(4,4) format="%uchar" \
          dx=2:1 dy=1:2 origin=(0,0):(20,20) flipy u 1:2:3 w image

if (strstrt(GPVAL_COMPILE_OPTIONS, "+WATCHPOINTS")) {
  se  st    watch      label  point pt 6 ps 1 noboxed tc "blue"
  set style watchpoint labels point pt 4 ps 2
  set style watchpoint labels font ":Italic,6" tc "blue"
  set style watchpoint labels boxed offset 1, 0.5
}

γv=-3.81250
x0v=0.244311
ampv=27.1042
mylor(x)=ampv/(((x-x0v)/γv)**2+1)-31
set label 1 at 1.45+10,mylor(0)-3 'width label' right
set arrow 1 from 1.45+10,mylor(0)-3 to 1.45,mylor(0)-3 lw 2
plot for [i=2:5] $MULTI_A index i using 1:2 with points pointtype 13 linecolor i title 'T=' . tstr(i) . ' deg'
p    for [i=2:5] $MULTI_A i     i u     1:2 w    p      pt        13 lc        i t '    T=' . tstr(i) . ' deg'
p $DATA_A u ($1/10**6-74310/115):($2) w p pt 7 ps 0.5
myefe(x) = sin(x)*0.4+1
sfn(i) = sprintf("syn_ser_%03d.dat",i)
plot myefe(x) w l lt black notit,\
  sfn(1) i 0 u 1:2:3 w p ps 2.5 pt 13 lc pal notit
sp for [i=0:*] $MULTI_A index i using 1:2:3 with lines
msym(z) = "ABCDEF"[int(z):int(z)]
sp $LBV_A using 1:2:4:(msym($4)) with labels
plot $LBV_A using 1:2:3:4:5 with labels tc variable rotate variable

plot for [i=2:3] $DATA_B u 1:i w l lw 2, \
     for [i=2:3] $DATA_B i 0 u 1:i notitle w filledcurves x1 fill transparent solid .4 lc i-1

plot $DATA_B using "%*lf%lf%*lf"
plot $CSV_A using 1:($2+$3) '%lf,%lf,%lf'
plot $DATA_B using 1:2:xtic( $3 > 1.5 ? "A" : "B" )
set parametric
plot [-pi:pi] [-1.3:1.3] [-1:1] sin(t),t**2
unset parametric
plot [:200] [-pi:] $DATA_A using 1:2

set samples 100
gfn1(x) = x*0.5
gfn2(x) = x*0.25+3
gfn3(x) = x*0.1+6
plot sample [0:10] gfn1(x), [10:20] gfn2(x), [20:30] gfn3(x)
plot        [0:10:0.1] gfn1(x), [10:20] gfn2(x), [20:30] gfn3(x)
plot        [0:10:0.2] gfn1(x), [10:20] gfn2(x), [20:30] gfn3(x)

plot for [file in "syn_ser_001.dat syn_ser_002.dat"] for [column=2:*] file using 1:column
remultiplot
set term svg dynamic # first synthetic canvas
plot $HM_A matrix w image
lower  # lower the only canvas that exists so far
set term svg size 620,400 # second synthetic canvas
plot $DATA_A u 1:2
raise 123 # raise first canvas again
plot x*x with filledcurve closed, 40 with filledcurve y=10
plot x*x, (x>=-5 && x<=5 ? 40 : 1/0) with filledcurve y=10 lt 8
splot x*x-y*y with pm3d, x*x+y*y with pm3d at t
splot for [i=0:*] $MULTI_A index i using 1:2:3 with lines

print 1,"label text one",lblno

plot for [i=1:*] file=sprintf("syn_ser_%03d.dat",i) file using 2 title file

splot [phi=1:720:2] '+' using (cos(phi)):(sin(phi)):(phi)

plot myfn1(x)
plot [ ] [-2:sin(5)*-8] sin(x)**besj0(x) w l

plot x*x with filledcurves closed, 40 with filledcurve r=10
plot x*x, (x>=-5 && x<=5 ? 40 : 1/0) with filledcurve y=10 lt 8

stats $DATA_B every ::12 i 0 u 1:2 noout name "SYNA"
stats '+' name 'SYNB' noout

ga=1; gb=1; gc=1
myfit(x) = ga*x**2 + gb*x + gc
fit myfit(x) $FITD u 1:2 via ga,gb,gc

set t svg
stats $HM_A matrix name "SMB" nooutput

set key opaque fc rgb variable
set key width 2 height 1 at graph 0.9,0.9 spacing 1
set key autotitle columnheader invert maxcols auto
set k   a         col          inv    maxcol  a
set key autotitle columnheader columns 3
se k a col col 3 # abbreviation stress line

p sin(x) w l t 'This'
set key title "Outcomes" left
set key box title "with filledcurves"
set arrow 1 from 0,0 to 1,1
set style arrow 1 default
set style histogram errorbars gap 1
set st    hist      clustered

set datafile separator tab
set dataf    sep       tab
set dataf    sep       comma
set dataf    sep       whitespace

set format z "%g" numeric

print arg({1,1})
print sprintf("%x", 254)
print strlen("synthetic")

set fit logfile default
set fit logfile "syn_fit.log"

set spiderplot
array arrA[3] = [3,4,5]
array arrB[3] = [5,2,4]
set for [i=1:3] paxis i range [0:10]
plot keyentry with spiderplot lc 3 lw 3 title "Array #1",\
for [i=1:|arrA|] arrA using (arrA[i]) lc 3 lw 3 title sprintf("Scale %d",i),\
newspiderplot, keyentry with spiderplot lc 4 lw 2 title "Array #2",\
for [j=1:|arrB|] arrB using (arrB[j]) lc 4 lw 2 notitle
unset spiderplot

p sin(x) w lp lw 2 pt 2 dt 4 pi 5 lc palette frac 0.5

dotp(A, B) = (|A| != |B|) ? NaN : sum [i=1:|A|] A[i] * B[i]
set arrow 3 from 0,0 length 1 angle 45
set arrow 3 from 0,0 length 1 angle 45
set st data spiderplot
set st spiderplot ls 3
set st histogram tit font "SynthSerif,14"
set st histogram nokeyseparator
set style data lines

p for[i=1:3] $MULTI_A index i u 1:2 w l

eval "set dataf sep whitespace"

do for [pal in "synpal_a synpal_b synpal_c"] {
  set print pal.'.gp'
  print "set palette gray"
  unset print
}
do for [pal in "synpal_a synpal_b synpal_c\
"] {
  filename = pal.'.gp'
  load filename

  set lmargin 4;set rmargin 0
  p $HM_A matrix w image

  array labix[2] = [1,2]
  set for[i=1:5] label i pal at -1,0 left front offset 1,1
  set label labix[1] "l" at -1,0 left front
  set label 1 "l" at -1,0 left front
  set for[i=1:5] paxis i label sprintf("Score %d",i) offset 1
  set for[i=1:5] paxis i label "--------SYN--------" offset 1
  set for[i=1:5] label i       "--------SYN--------" offset 1
  break
  xtxt = "Synthetic Heights\nby District"
  plot 'syn_tab.tsv' using 5:4:(myname(stringcolumn(1), $3)) with labels
  set paxis 1 label sprintf("Score %d", i) offset 1
  set label 1       sprintf("Score %d", i) offset 1
  set for[i=1:5] label i sprintf("Label %d", i)

  set lmargin 1;set rmargin 1
  p for [ii=1:8] f(x,ii) ls ii lw 2
  unset label
}

array sx[200]
array sy[200]
stats $DATA_B u (sx[$0+1]   , sy[$0+1]   ) noout
stats $DATA_B u (sx[$0+1]=$1, sy[$0+1]=$2) noout
array cnt[8]
nvv = 8; p0v = 0; dpv = 25; radv = 2.5
do for [i=1:nvv] {
  if (p=real(i)/nvv*100, p>=p0v ? p0v=(floor(p/dpv)+1)*dpv : 0) {
    print sprintf("Progress: %.0f%%", p)
  }
  cnt[i] = 0
  stats $DATA_B u ( cnt[i] = cnt[i] + (sqrt((sx[i]-$1)**2 + (sy[i]-$2)**2) <= radv )) noout
}

set title "something synthetic"
plot $DATA_A using 1:2 title "series label"
plot $DATA_A using 1:2 notitle
splot $VOXD_A title "surface label"
splot $VOXD_A notitle

plot $DATA_A using 0:(column(int($1)%2 + 1))

plot for [i=1:*] file=sprintf("syn_ser_%03d.dat",i) file using 2 title file
plot fq(x) = sin(x*aq), aq = .2, fq(x), aq = .4, fq(x)

splot myg(x,y) with contourfill notitle, \
      myg(x,y) lt black title "Contour levels dz = 5"
set surface implicit
set surface explicit
unset surface
set surface
set grid nomxtics ytic mztics polar 10 novertical
set grid nopolar
set title "synthetic title" noenhanced font "SynthSans,15" offset 1,1,1
plot "syn_tab.tsv" skip 1 notitle
plot \
  $DATA_A u (20):(6) w points pt 7 ps 1 lc rgb "gray30" noenhanced, \
  $DATA_A u (0):(0):("(center_u, center_v)") w labels offset 0,-1 noenhanced, \
  $DATA_A u (45):(10.):("sector_angle") w labels center noenhanced rotate by -45, \
  $DATA_A u (90):(7.5):("annular_width") w labels offset 0,1.0 noenhanced, \
  $DATA_A u (20):(6):("corner\n(azimuth, radius)") w labels off -2,-1 right

set lab 1 "tag text one" at 1,1,1 off 0,0,0 noenhanced
set lab   "tag text two" at 1,1,1 off 0,0,0 noenhanced

plot "syn_ser_001.dat" with lines, "syn_ser_002.dat" with points
plot [t=1:10] [-pi:pi*2] tan(t), \
  $DATA_B using (tan($2)):($3/2) smooth csplines \
axes x1y2 notitle with lines

plot for [dfile in "syn_ser_001.dat syn_ser_002.dat"] dfile

plot '++' using ($1):($2):($2*0.4):(-$1*0.4) with vectors

plot $PTS_A u 1:2 smooth kdensity bandwidth 1 with boxes
plot $CURVE_A u 1:2 smooth kdensity period 2*pi with lines

set title "3D sampling range distinct from plot x/y range"
set xrange [1:100]
set yrange [1:100]
splot sample [u=30:70][v=0:50] '++' using 1:2:(u*v) lt 3, \
             [u=40:80][v=30:60] '++' using (u):(v):(u*sqrt(v)) lt 4

fnamev = "syn_ser_001.dat"
eosv = strlen(fnamev)
if (fnamev[eosv-3:*] eq ".dat") {
  set output fnamev[1:eosv-4] . ".svg"
  plot fnamev
}

set encoding utf8
msym2(z) = "•□+⊙♠♣"[int(z):int(z)]
sp $LBV_A using 1:2:4:(msym2($4)) with labels

arrA[1] = 2
plotv = "syn_ser_001.dat"
titlev = "Synthetic Title"
plot plotv title titlev
av=bv=cv=dv=ev=0
barq = 1; barq1 = 2; barq2 = 3
undefine barq*
array arrC[3] = [1,2,3]
arrC[1] = arrC[2]*2
print arrC

hfit(x) = ha*x + hb
ha = 1; hb = 1
f   hfit(x)   $FITD u 1:2 via ha,hb
fit hfit(x) $FITD u 1:2 via ha,hb
hval = 5

$HM_B << EOD
6 4 2 1 0
2 1 0 0 1
0 0 0 2 0
0 1 2 3 3
1 0 2 2 1
EOD

set label "generated on `date +%Y-%m-%d` by synthetic run" at 1,1
set timestamp "generated on %Y-%m-%d by `whoami`"
FILESV = split( "`ls -1`" )
macrov = "print 'synthetic hello'"
@macrov

print av, bv, cv
datav = "$CURVE_A"
plot datav convexhull expand 1 smooth path
plo  datav convexhull smooth path expand 1
pl   datav smooth path concavehull expand 1
p    datav concavehull smooth path expand 1

yesc = "\""
xq = "`whoami`"
xesc = "\U2001\'\%\t\n\r\s\w\d\f\z\245\\"
ypct = "%"
zesc = "\'SYN\'"
set label lblno argstr at 0.4,1.2 textcolor lt 1
myfn6(x) = x**2
array arrD[6]
arrD[1] = 1
arrD[2] = 2.0
arrD[3] = {3.0, 3.0}
arrD[4] = "four"
arrD[6] = arrD[2]**3
array arrE[6] = [ 1, 2.0, arrD[3], "four", , arrD[2]**3 ]
array arrF = split("P Q R S T U")
dplt = "./syn_"
vsn(j) = sprintf("v%d", j)
grf(i) = sprintf("g%d", i)
jv = 1; iv = 1
set output dplt . 'plot_' . vsn(jv) . '_vs_' . grf(iv-1) . '.tex'
set outpu  dplt . 'plot_' . vsn(jv) . '_vs_' . grf(iv-1) . '.tex'
set outp   dplt . 'plot_' . vsn(jv) . '_vs_' . grf(iv-1) . '.tex'
set out    dplt . 'plot_' . vsn(jv) . '_vs_' . grf(iv-1) . '.tex'
set ou     dplt . 'plot_' . vsn(jv) . '_vs_' . grf(iv-1) . '.tex'
set o      dplt . 'plot_' . vsn(jv) . '_vs_' . grf(iv-1) . '.tex'

set fit quiet
gfq(i,x) = i + x
xfq(i) = 0.5*i
set label sprintf('U%d = %2.1f', 2, xfq(1)) at (xfq(1)-2), (gfq(1,xfq(1))+1.0)
system "echo synthetic done"
