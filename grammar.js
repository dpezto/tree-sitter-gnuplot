// Based on http://gnuplot.info/docs_5.5/Gnuplot_5_5.pdf

const PREC = {
  TERNARY: -1, // a?b:c
  OR: 1, // a||b
  AND: 2, // a&&b
  COMPARE: 3, // a==b a!=b a<b a>b a<=b a>=b  A eq B  A ne B
  BIT_OR: 4, // a|b a^b
  BIT_NOT: 5, // ~a
  BIT_AND: 6, // a&b
  SHIFT: 7, // << >>
  CONCAT: 8, // A.B
  PLUS: 9, // a+b a-b
  TIMES: 10, // a*b a/b a%b
  UNARY: 11, // -a +a !a $a |a|
  POWER: 12, // a**b a!
  PAREN: 13, // (a)
};

// TODO: add gnuplot constants or maybe just add them to the queries

module.exports = grammar({
  name: 'gnuplot',

  extras: $ => [
    $.comment,
    /[\s\f\uFEFF\u2060\u200B]|\\\r?\n/,
    /\\/
  ],

  inline: $ => [
    $.string_literal,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$._expression],
    [$.style_opts],
    [$.palette],
    [$.label],
    [$.xdata],
    [$.xlabel],
    [$.datafile_modifiers],
    [$.plot_style],
    [$._i_e_u_directives],
  ],

  rules: {
    source_file: $ => repeat($._statement),

    _statement: $ => seq(
      choice(
        $._command,
        $._assignment,
        $.macro,
      ),
      optional(';'),
    ),

    _command: $ => choice(
      // $.c_bind, // p. 64
      // $.c_break,
      // $.c_cd,
      // $.c_call,
      // $.c_clear,
      // $.c_continue,
      $.c_do,
      $.c_eval,
      // $.c_exit, // quit p. 104
      $.c_fit,
      // $.c_help,
      // $.c_history,
      $.c_if,
      // $.c_import,
      $.c_load,
      // $.c_lower, // p. 142
      // $.c_pause,
      $.c_plot,
      $.c_print, // printerr
      // $.c_pwd,
      // $.c_quit,
      // $.c_raise, // p. 142
      // $.c_refresh,
      $.c_replot,
      $.c_reset,
      // $.c_save,
      $.c_set, // set, unset, show
      $.c_show, // show only p. 242
      $.c_splot,
      $.c_stats,
      // $.c_system,
      $.c_test,
      // $.c_toggle,
      $.c_undefine,
      // $.c_vclear,
      // $.c_vfill,
      $.c_while,
    ),

    //-------------------------------------------------------------------------
    c_do: $ => seq('do', $.for_block, '{', repeat($._statement), '}'),

    c_eval: $ => seq('eval', $._expression),

    c_fit: $ => seq(
      'fit',
      optional($.range_block),
      field('func', $._function),
      field('data', $._expression),
      optional($.datafile_modifiers),
      optional(repeat1(choice(
          'unitweights',
          /(y|xy|z)err(o(r)?)?/,
          seq('errors', $._expression, optional(repeat1(seq(',', $._expression)))),
      ))),
      'via',
      choice(
        field('parameter_file', $._expression),
        field('var', seq($._expression, repeat1(seq(',', $._expression)))),
      ),
    ),

    c_if: $ => seq(
      'if', '(', $._expression, ')',
      '{', repeat($._statement), '}',
      repeat(seq(
        'else', 'if', '(', repeat1($._expression), ')',
        '{', repeat($._statement), '}',
      )),
      optional(seq('else', '{', repeat($._statement), '}')),
    ),

    c_load: $ => seq('load', $._expression),

    c_plot: $ => seq(
        /p(l(o(t)?)?)?/,
        repeat($.range_block),
        $.plot_element,
        repeat(seq(choice(',', /,\s*\\/), $.plot_element)),
    ),

    plot_element: $ => prec.left(1, seq(
      field('iteration', optional($.for_block)),
      choice(
        seq(alias($._assignment, $.definition), repeat(seq(',', $._assignment)), ',',$._function),
        seq(field('func', $._function)),
        seq(alias($._expression, $.data), optional($.datafile_modifiers)), // data source
      ),
      repeat(choice(
        seq('axes',/(x1y1|x2y2|x1y2|x2y1)/),
        choice(/not(i(t(l(e)?)?)?)?/, field('title', seq(/t(i(t(l(e)?)?)?)?/, $._expression))), // p. 138-139
        choice(seq(/w(i(t(h)?)?)?/, $.plot_style, optional($.style_opts)), $.style_opts) // p. 139-140
      )),
    )),

    plot_style: $ => choice(/l(i(n(e(s)?)?)?)?/, /p(o(i(n(t(s)?)?)?)?)?/, /lp|linespoints/,
      /fin(a(n(c(e(b(a(r(s)?)?)?)?)?)?)?)?/, /d(o(t(s)?)?)/, /i(m(p(u(l(s(e(s)?)?)?)?)?)?)?/,
      seq(/lab(e(l(s)?)?)?/, repeat($._label_opts)), /sur(f(a(c(e)?)?)?)?/, /st(e(p(s)?)?)?/,
      /fsteps/, /histeps/, /arr(o(w(s)?)?)?/, seq(/vec(t(o(r(s)?)?)?)?/, repeat($._arrow_opts)),
      /(x|y|xy)errorbar/, /(x|y|xy)errorlines/, /parallelaxes/,
      // or
      /boxes/, /boxerrorbars/, /boxxyerror/, /isosurface/, /boxplot/,
      /candlesticks/, /circles/, /zerrorfill/, /ellipses/, /filledcurves/,
      seq(/fillsteps/, optional(/above|below/), optional($._expression)), /histograms/, /ima(g(e)?)?/,
      /pm3d/,
      /rgbalpha/, /rgbimage/, /polygons/,
      // or
      /table/, /mask/
    ),

    style_opts: $ => repeat1(choice( // p. 139
      $._line_opts,
      field('pt', seq(/pointtype|pt/, $._expression)),
      field('ps', seq(/pointsize|ps/, $._expression)),
      field('as', seq(/arrowstyle|as/, $._expression)),
      field('fs', seq(/fill|fs/, $._expression)),
      field('fc', seq(/fillcolor|fc/, $.colorspec)),
      /nohidden3d/, /nocontours/, /nosurf(a(c(e)?)?)?/, /pal(e(t(t(e)?)?)?)?/
    )),

    c_print: $ => seq('print', $._expression, repeat(seq(',', $._expression))),

    c_replot: $ => /rep(l(o(t)?)?)?/,

    c_reset: $ => seq('reset', optional(choice('bind', 'errors', 'session'))),

    c_set: $ => seq(choice(seq(/set?/, optional($.for_block)), /uns(e(t)?)?/), $._argument_set_show),

    _argument_set_show: $ => choice(
      $.angles, $.arrow, $.border, $.boxwidth, $.boxdepth,
      $.color, $.colormap, $.colorsequence, $.clip, $.cntrlabel, $.cntrparam, $.colorbox, $.contour, $.cornerpoles,
      $.dashtype, $.datafile, $.decimalsign, $.dgrid3d,
      // $.dummy,
      $.encoding, $.errorbars, $.fit, $.format, $.grid, $.hidden3d, $.history,
      $.isosamples, $.isosurface, $.isotropic,
      // $.jitter,
      $.key, $.label, $.linetype,
      // $.link,
      // $.loadpath,
      $.locale, $.logscale,
      $.mapping, $.margin, $.micro, $.minussign, $.monochrome, $.mouse, $.multiplot, $.mxtics,
      // $.nonlinear,
      // $.object,
      // $.offsets,
      // $.origin,
      $.output, $.overflow, $.palette, $.parametric,
      // $.paxis,
      // $.pixmap,
      $.pm3d,
      // $.pointintervalbox,
      $.pointsize, $.polar, $.print, $.psdir,
      $.raxis, $.rgbmax,
      $.samples, $.size, $.spiderplot, $.style, $.surface,
      $.table, $.terminal,
      // $.termoption,
      $.theta, $.tics,
      // $.timestamp, // p. 224
      $.timefmt, $.title,
      // $.ttics // p. 226
      $.version, $.vgrid, $.view,
      $.walls, $.xdata, $.xdtics, $.xlabel, $.xmtics, $.xrange, $.xtics, $.xyplane, $.zero, $.zeroaxis,
    ),

    angles: $ => seq(/(an(g(l(e(s)?)?)?)?)/, optional(choice('degrees', 'radians'))),

    arrow: $ => prec.left(seq(/arr(o(w)?)?/,
      optional(alias($._expression, $.tag)),
      optional(choice(
        seq(optional(seq(alias('from', $.from), $.position)), alias(choice('to', 'rto'), $.to_rto), $.position),
        seq(alias('from', $.from), $.position, alias(/len(g(t(h)?)?)?/, $.length), $._expression, alias(/an(g(l(e)?)?)?/, $.angle), $._expression)
      )),
      repeat($._arrow_opts),
    )),

    border: $ => seq('border', optional(repeat1(choice(
      /(front|back|behind)/,
      $._line_opts,
      'polar',
    )))),

    boxwidth: $ => prec.left(seq('boxwidth', optional(repeat1(choice(
      field('width', $._expression),
      /absolute|relative/,
    ))))),

    boxdepth: $ => prec.left(seq('boxdepth', optional(repeat1(choice(
      field('y_extent', $._expression),
      'square'
    ))))),

    color: $ => 'color',

    colormap: $ => prec.left(seq('colormap', optional(choice(
      seq('new', $._expression),
      seq($._expression, $.range_block)
    )))),

    colorsequence: $ => seq('colorsequence', optional(choice('default', 'classic', 'podo'))),

    clip: $ => seq('clip', optional(choice('points', 'one', 'two', 'radial'))),

    cntrlabel: $ => seq('cntrlabel', optional(repeat1(choice(
      seq('format', $._expression),
      seq('font', $._expression),
      seq('start', $._expression),
      seq('interval', $._expression),
      'onecolor',
    )))),

    cntrparam: $ => seq('cntrparam', optional(choice(
      'linear',
      'cubicspline',
      'bspline',
      seq('points', $._expression),
      seq('order', $._expression),
      seq(/le(v(e(l(s)?)?)?)?/,
        choice(
          $._expression,
          prec.left(1, seq('auto', optional($._expression))),
          prec.left(1, seq('discrete', $._expression, repeat(seq(',', $._expression)))),
          prec.left(1, seq(/in(c(r(e(m(e(n(t(a(l)?)?)?)?)?)?)?)?)?/, $._expression, ',', $._expression, optional(seq(',', $._expression)))),
        ),
        optional(/((un)?sorted)/),
        optional(seq('firstlinetype', $._expression)),
      ),
    ))),

    colorbox: $ => seq(/colorb(o(x)?)?/, optional(repeat1(choice( // p. 155
      /v(e(r(t(i(c(a(l)?)?)?)?)?)?)?|h(o(r(i(z(o(n(t(a(l)?)?)?)?)?)?)?)?)?/,
      /(no)?inv(e(r(t)?)?)?/,
      /def(a(u(l(t)?)?)?)?|u(s(e(r)?)?)?/,
      seq(/o(r(i(g(i(n)?)?)?)?)?/, $.position),
      seq(/s(i(z(e)?)?)?/, $.position),
      /fr(o(n(t)?)?)?|ba(c(k)?)?/,
      choice(
        /nobo(r(d(e(r)?)?)?)?/,
        /bd(f(a(u(l(t)?)?)?)?)?/,
        seq(/bo(r(d(e(r)?)?)?)?/, $._expression), //linestyle
      ),
      seq('cbtics', $._expression), //linestyle
    )))),

    contour: $ => seq('contour', optional(choice('base', 'surface', 'both'))),

    cornerpoles: $ => 'cornerpoles',

    dashtype: $ => seq(/dashtype|dt/, field('tag',$._expression), $._dash_opts),

    _dash_opts: $ => choice(
      $.integer, $._string_literal,
      seq(
        '(',
        alias($.integer, $.solid_lenght), ',', alias($.integer, $.empty_lenght),
        optional(seq(',', alias($.integer, $.solid_lenght), ',', alias($.integer, $.empty_lenght))),
        optional(seq(',', alias($.integer, $.solid_lenght), ',', alias($.integer, $.empty_lenght))),
        optional(seq(',', alias($.integer, $.solid_lenght), ',', alias($.integer, $.empty_lenght))),
        ')'
      ),
    ),

    datafile: $ => prec.left(seq(/dataf(i(l(e)?)?)?/, optional(choice(
      /columnhead(e(r(s)?)?)?/,
      /fort(r(a(n)?)?)?/,
      'nofpe_trap',
      seq(/miss(i(n(g)?)?)?/, choice(field('string', $._expression), 'NaN')),
      seq(/sep(a(r(a(t(o(r)?)?)?)?)?)?/, choice(/white(s(p(a(c(e)?)?)?)?)?/, 'tab', 'comma', $._expression)), // chars
      seq('commentschars', optional(field('string', $._expression))),
      seq('binary', $._expression), // binary list pag 160 -> 118 -> 245
    )))),

    decimalsign: $ => prec.left(seq('decimalsign', choice($._expression, seq('locale', optional($._expression))))),

    dgrid3d: $ => prec.left(seq(/dg(r(i(d(3(d)?)?)?)?)?/, repeat1(choice( // p. 161
      seq(field('rows', $._expression), optional(seq(',', field('cols', $._expression)))),
      choice(
        'splines',
        seq('qnorm', $._expression),
        seq(
          choice('gauss', 'cauchy', 'exp', 'box', 'hann'),
          optional('kdensity'),
          optional($._expression),
          optional(seq(',', $._expression)),
        )
      )
    )))),

    // dummy: $ =>

    encoding: $ => seq(/enc(o(d(i(n(g)?)?)?)?)?/, choice(
      'default', /iso_8859_(1|15|2|9)/, /koi8(r|u)/, /cp(437|85(0|2)|950|125(0|1|2|4))/, 'sjis', 'utf8', 'locale'
    )),

    errorbars: $ => prec.left(seq('errorbars', repeat(choice(
      choice('small', 'large', 'fullwidth', field('size', $._expression)),
      choice('front', 'back'),
      $._line_opts
    )))),

    fit: $ => seq('fit', repeat1(choice(
      choice('nolog', seq('logfile', choice($._expression, 'default'))),
      choice(/(no)?quiet/, 'results', 'brief', 'verbose'),
      choice(/(no)?err(o(r(v(a(r(i(a(b(l(e(s)?)?)?)?)?)?)?)?)?)?)?/),
      choice(/(no)?covariancevariables/),
      choice(/(no)?errorscaling/),
      choice(/(no)?prescale/),
      seq('maxiter', choice(field('value', $._expression), 'default')),
      seq('limit', choice(field('epsilon', $._expression), 'default')),
      seq('limit_abs', field('epsilon_abs', $._expression)),
      seq('start-lambda', choice($._expression, 'default')),
      seq('lambda-factor', choice($._expression, 'default')),
      seq('script', optional(choice(field('command', $._expression), 'default'))),
      /v4|v5/
    ))),

    format: $ => seq('format', optional(/(x|y|xy|x2|y2|z|cb)/), field('fmt_str', $._expression), optional(/(numeric|timedate|geographic)/)),

    grid: $ => seq('grid', repeat(choice(
      /(no)?m?(x|y|z|x2|y2|r|cb)tics/,
      seq('polar', optional(field('angle', $._expression))),
      /layerdefault|front|back/,
      /(no)?vertical/,
      seq(alias($._line_opts, $.line_prop_major), optional(seq(',', alias($._line_opts, $.line_prop_minor))))
    ))),

    hidden3d: $ => seq(/hid(d(e(n(3(d)?)?)?)?)?/, optional(choice(
      'defaults',
      repeat1(choice(
        /front|back/,
        choice(seq('offset', $._expression), 'nooffset'),
        seq('trianglepattern', $._expression),
        choice(seq('undefined', $._expression), 'noundefined'),
        /((no)?altdiagonal)/,
        /((no)?bentover)/,
      ))
    ))),

    history: $ => seq(/his(t(o(r(y)?)?)?)?/, repeat(choice(
      field('size', seq('size', $._expression)),
      /quiet|num(b(e(r(s)?)?)?)?/,
      /full|trip/,
      /def(a(u(l(t)?)?)?)?/,
    ))),

    isosamples: $ => prec.left(seq(/iso(s(a(m(p(l(e(s)?)?)?)?)?)?)?/, optional(seq($._expression, optional(seq(',', $._expression)))))),

    isosurface: $ => seq(/isosurf(a(c(e)?)?)?/, optional(choice('mixed', 'triangles')), optional(choice('noinsidecolor', seq('insidecolor', $._expression)))),

    isotropic: $ => 'isotropic',

    // jitter: $ =>

    key: $ => seq(/k(e(y)?)?/, repeat(choice( // p. 173-177
      /(on|off)/,
      'default',
      /(no)?enhanced/,
      seq(/(no)?a(u(t(o(t(i(t(l(e)?)?)?)?)?)?)?)?/, optional('columnheader')),
      seq(/(no)?box/, optional($._line_opts)),
      seq(/(no)?opaque/, optional(seq('fc', $.colorspec))),
      seq('width', field('increment', $._expression)),
      seq('height', field('increment', $._expression)),
      // layout
      /ver(t(i(c(a(l)?)?)?)?)?|hor(i(z(o(n(t(a(l)?)?)?)?)?)?)?/,
      seq('maxcols', optional(choice($._expression, 'auto'))),
      seq('maxrows', optional(choice($._expression, 'auto'))),
      seq('columns', $._expression),
      seq('keywidth', choice('screen', 'graph'), $._expression),
      /Left|Right/,
      /(no)?(reverse|invert)/,
      seq('samplen', field('length', $._expression)),
      seq('spacing', field('spacing', $._expression)),
      seq(/ti(t(l(e)?)?)?/, optional($._expression), optional(/(no)?enhanced/), optional(/c(e(n(t(e(r)?)?)?)?)?|l(e(f(t)?)?)?|r(i(g(h(t)?)?)?)?/)),
      seq('font', field('face_size', $._expression)),
      seq('textcolor', $.colorspec),
      // placement
      /(ins(i(d(e)?)?)?|o(u(t(s(i(d(e)?)?)?)?)?)?|fixed)/,
      /(l|r|t|b)m(a(r(g(i(n)?)?)?)?)?/,
      seq('at', $.position),
      /l(e(f(t)?)?)?|r(i(g(h(t)?)?)?)?|c(e(n(t(e(r)?)?)?)?)?/, /t(o(p)?)?|b(o(t(t(o(m)?)?)?)?)?|c(e(n(t(e(r)?)?)?)?)?/,
    ))),

    label: $ => seq(/lab(e(l)?)?/,
      optional(field('tag', $._expression)),
      optional(field('label', $._expression)),
      repeat($._label_opts)
    ),

    linetype: $ => seq('linetype', $._line_style),

    // link: $ =>

    // loadpath: $ =>

    locale: $ => prec.left(seq('locale', optional(field('locale', $._expression)))),

    logscale: $ => prec.left(seq('logscale', repeat1(/(x|y|z|x2|y2|cb|r)/), optional(field('base', $._expression)))),

    mapping: $ => seq('mapping', choice('cartesian', 'spherical', 'cylindrical')),

    margin: $ => prec.left(seq(/(l|r|t|b)?(mar)g?i?n?s?/, optional(choice(
      seq(optional('at screen'), $._expression),
      seq(field('lm', $._expression), ',', field('rm', $._expression), ',', field('bm', $._expression), ',', field('tm', $._expression)),
    )))),

    micro: $ => 'micro', // NOTE: experimental p. 184

    minussign: $ => 'minussign', // NOTE: experimental p. 184

    monochrome: $ => seq('monochrome',
      // {linetype N <linetype properties>}
    ), // p. 185

    mouse: $ => seq('mouse',
      // {doubleclick <ms>} {nodoubleclick}
      // {{no}zoomcoordinates}
      // {zoomfactors <xmultiplier>, <ymultiplier>}
      // {noruler | ruler {at x,y}}
      // {polardistance{deg|tan} | nopolardistance}
      // {format <string>}
      // {mouseformat <int> | <string> | function <f(x,y)>}
      // {{no}labels {"labeloptions"}}
      // {{no}zoomjump} {{no}verbose}
    ),

    multiplot: $ => seq('multiplot', repeat(choice(
      seq(/t(i(t(l(e)?)?)?)?/, field('title', $._expression), optional(seq('font', field('font', $._expression))), optional(/(no)?enhanced/)),
      seq(
        seq('layout', field('rows', $._expression), ',', field('cols', $._expression)),
        optional(/rowsfirst|columnsfirst/),
        optional(/downwards|upwards/),
        optional(seq('scale', field('xscale', $._expression), optional(seq(',', field('yscale', $._expression))))),
        optional(seq('offset', field('xoff', $._expression), optional(seq(',', field('yoff', $._expression))))),
        optional(seq('margins', field('lm', $._expression), ',', field('rm', $._expression), ',', field('bm', $._expression), ',', field('tm', $._expression))),
        optional(seq('spacing', field('xspacing', $._expression), optional(seq(',', field('yspacing', $._expression))))),
      ),
      /next|previous/,
    ))),

    mxtics: $ => prec.left(seq(/m(x|y|z|x2|y2|r|t|cb)tics/, optional(choice( // p. 190
      field('freq', $._expression),
      'default',
      seq(field('N', $._expression), field('units', choice('seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'))),
    )))),

    // nonlinear: $ =>

    // object: $ =>

    // offsets: $ =>

    // origin: $ =>

    output: $ => seq(/o(u(t(p(u(t)?)?)?)?)?/, field('name', $._expression)),

    overflow: $ => seq('overflow', choice('float', 'NaN', 'undefined')),

    palette: $ => seq(/pal(e(t(t(e)?)?)?)?/, repeat(choice(
      /gray|color/,
      seq('gamma', field('gamma', $._expression)),
      choice(
        seq('rgbformulae', field('r', $._expression), ',', field('g', $._expression), ',', field('b', $._expression)),
        seq('defined', optional(seq('(', seq(field('gray', $._expression), field('color', $._expression), repeat(seq(',', field('gray', $._expression), field('color', $._expression)))), ')'))),
        seq('file', field('filename', $._expression), optional($.datafile_modifiers)),
        seq('colormap', field('colormap_name', $._expression)),
        seq('functions', field('R', $._expression), ',', field('G', $._expression), ',', field('B', $._expression)),
      ),
      seq('cubehelix', optional(seq('start', field('val', $._expression))),
        optional(seq('cycles', field('val', $._expression))),
        optional(seq('saturation', field('val', $._expression))),
      ),
      'viridis',
      seq('model', choice('RGB', 'CMY', seq('HSV', optional(seq('start', field('radians', $._expression)))))),
      choice('positive', 'negative'),
      choice('nops_allcF', 'ps_allcF'),
      seq('maxcolors', field('maxcolors', $._expression)),
    ))),

    parametric: $ => /pa(r(a(m(e(t(r(i(c)?)?)?)?)?)?)?)?/,

    // paxis: $ =>

    // pixmap: $ =>
    // <index> {"filename" | colormap <name>}
    //         at <position>
    //         {width <w> | height <h> | size <w>,<h>}
    //         {front|back|behind} {center}

    pm3d: $ => seq('pm3d', repeat(choice(
      seq('at', $.position), // TODO: p. 206
      seq(/interpolate/, field('steps', $._expression)),
      field('scanorder', choice(
        'scansautomatic',
        'scansforward',
        'scansbackward',
        seq(/dep(t(h(o(r(d(e(r)?)?)?)?)?)?)?/, optional('base')),
        /hi(d(d(e(n(3(d)?)?)?)?)?)?/,
      )),
      seq('flush', choice('begin', 'center', 'end')),
      choice('ftriangles', 'noftriangles'),
      choice(seq('clip', field('z', $._expression)), 'clip1in', 'clip4in'),
      choice('clipcb', 'noclipcb'),
      seq('corners2color', choice('mean', 'geomean', 'harmean', 'rms', 'median', 'min', 'max', 'c1', 'c2', 'c3', 'c4')),
      seq(/(no)?lighting/, optional(seq('primary', field('fraction', $._expression))), optional(seq('specular', field('fraction', $._expression))), optional(seq('spec2', field('fraction', $._expression)))),
      seq(/(no)?border/, optional('retrace'), optional($._line_opts)),
      choice('implicit', 'explicit'),
      'map'
    ))),

    // pointintervalbox: $ =>

    pointsize: $ => seq(/poi(n(t(s(i(z(e)?)?)?)?)?)?/, field('multiplier', $._expression)),

    polar: $ => /pol(a(r)?)?/,

    print: $ => seq('print', $._expression), // TODO: complete

    psdir: $ => seq('psdir', $._expression),

    raxis: $ => /rax(i(s)?)?/,

    rgbmax: $ => prec.left(seq('rgbmax', optional($._expression))),

    samples: $ => seq(/sam(p(l(e(s)?)?)?)?/, $._expression, optional(seq(',', $._expression))),

    size: $ => seq('size', choice(
      choice(/(no)?square/, seq('ratio', $._expression), 'noratio'),
      seq(field('xscale', $._expression), ',', field('yscale', $._expression)),
    )),

    spiderplot: $ => 'spiderplot',

    style: $ => seq(/st(y(l(e)?)?)?/, choice(
      seq(alias(/arr(o(w)?)?/, $.arrow, choice('default', $._arrow_opts))),
      seq(alias('boxplot', $.boxplot)), // TODO: p. 214
      seq(alias(/d(a(t(a)?)?)?/, $.data), $.plot_style),
      seq(alias('fill', $.fill), $.fill_style),
      seq(alias(/f(u(n(c(t(i(o(n)?)?)?)?)?)?)?/, $.func), $.plot_style),
      seq(alias(/l(i(n(e)?)?)?/, $.line), $._line_style),
      seq(alias(/circ(l(e)?)?/, $.circle), repeat(choice(
        seq(/rad(i(u(s)?)?)?/, optional($.system), $._expression),
        /(no)?wedge/, /(no)?clip/
      ))),
      seq(alias(/rect(a(n(g(l(e)?)?)?)?)?/, $.rectangle)), // TODO: p. 218
      seq(alias('ellipse', $.ellipse)), // TODO: p. 219
      seq(alias('parallelaxis', $.parallelaxis), seq(optional(/front|back/), optional($._line_opts)),
      seq(alias('spiderplot', $.spiderplot)), // TODO: p. 219
      seq(alias('textbox', $.textbox)) // TODO: p. 220
    ))),

    surface: $ => seq(/su(r(f(a(c(e)?)?)?)?)?/, optional(choice('implicit', 'explicit'))),

    table: $ => seq(/ta(b(l(e)?)?)?/, repeat(choice(
      choice($._string_literal, ), // TODO: add $datablock p. 220
      'append',
      seq(/sep(a(r(a(t(o(r)?)?)?)?)?)?/, choice(/white(s(p(a(c(e)?)?)?)?)?/, 'tab', 'comma', $._expression))
    ))),

    terminal: $ => seq(/t(e(r(m(i(n(a(l)?)?)?)?)?)?)?/, optional(choice($._terminal_type, 'push', 'pop'))),

    _terminal_type: $ => choice(
      $.t_cairolatex, $.t_canvas, $.t_cgm, $.t_context, $.t_domterm, $.t_dumb, $.t_dxf,
      $.t_emf, $.t_epscairo, $.t_epslatex, $.t_fig, $.t_gif, $.t_hpgl, $.t_jpeg, $.t_lua,
      $.t_pcl5, $.t_pdfcairo, $.t_png, $.t_pngcairo, $.t_postscript, $.t_pslatex, $.t_pstricks,
      $.t_qt, $.t_sixelgd, $.t_svg, $.t_tek4xxx,
      // $.t_texdraw,
      // $.t_tikz,
      // $.t_tkcanvas,
      /u(n(k(n(o(w(n)?)?)?)?)?)?/, // $.t_webp
    ),

    t_cairolatex: $ => seq(/cai(r(o(l(a(t(e(x)?)?)?)?)?)?)?/, repeat(choice(
      choice('eps', 'pdf', 'png'),
      choice('standalone', 'input'),
      choice('blacktext', 'colortext', 'colourtext'),
      choice(seq('header', field('header', $._expression)), 'noheader'),
      choice('mono', 'color'),
      /(no)?transp(a(r(e(n(t)?)?)?)?)?/,
      /(no)?crop/,
      seq('background', field('color', $._expression)),
      seq('font', field('font', $._expression)),
      seq('fontscale', field('scale', $._expression)),
      seq(/lw|linewidth/, field('lw', $._expression)),
      choice('rounded', 'butt', 'square'),
      seq(/dl|dashlength/, field('dl', $._expression)),
      seq(/si(z(e)?)?/, field('x', $._expression), /cm|in/, ',', field('y', $._expression), /cm|in/),
      seq('resolution', field('dpi', $._expression)),
    ))),

    t_canvas: $ => seq(/can(v(a(s)?)?)?/), // TODO: complete
    t_cgm: $ => seq(/cgm?/), // TODO: complete
    t_context: $ => seq(/co(n(t(e(x(t)?)?)?)?)?/), // TODO: complete
    t_domterm: $ => seq(/do(m(t(e(r(m)?)?)?)?)?/), // TODO: complete
    t_dumb: $ => seq(/du(m(b)?)?/), // TODO: complete
    t_dxf: $ => seq(/dxf?/), // TODO: complete
    t_emf: $ => seq(/emf?/), // TODO: complete
    t_epscairo: $ => seq(/e(p(s(c(a(i(r(o)?)?)?)?)?)?)?/), // TODO: complete

    t_epslatex: $ => seq(/epsl(a(t(e(x)?)?)?)?/, repeat(choice( // TODO: complete
      seq(/si(z(e)?)?/, field('x', $._expression), /cm|in/, ',', field('y', $._expression), /cm|in/),
    ))),

    t_fig: $ => seq(/f(i(g)?)?/), // TODO: complete
    t_gif: $ => seq(/g(i(f)?)?/), // TODO: complete
    t_hpgl: $ => seq(/h(p(g(l)?)?)?/), // TODO: complete
    t_jpeg: $ => seq(/j(p(e(g)?)?)?/), // TODO: complete
    t_lua: $ => seq(/l(u(a)?)?/), // TODO: complete
    t_pcl5: $ => seq(/pc(l(5)?)?/), // TODO: complete
    t_pdfcairo: $ => seq(/pd(f(c(a(i(r(o)?)?)?)?)?)?/), // TODO: complete
    t_png: $ => seq('png'), // TODO: complete
    t_pngcairo: $ => seq(/pngc(a(i(r(o)?)?)?)?/), // TODO: complete
    t_postscript: $ => seq(/po(s(t(s(c(r(i(p(t)?)?)?)?)?)?)?)?/), // TODO: complete
    t_pslatex: $ => seq(choice(/psl(a(t(e(x)?)?)?)?/, /pstex?/)), // TODO: complete
    t_pstricks: $ => seq(/pstr(i(c(k(s)?)?)?)?/), // TODO: complete
    t_qt: $ => seq(/qt?/), // TODO: complete
    t_sixelgd: $ => seq(/si(x(e(l(g(d)?)?)?)?)?/), // TODO: complete
    t_svg: $ => seq(/svg?/), // TODO: complete

    t_tek4xxx: $ => seq(/tek4(0|1|2)\d\d/),

    // t_texdraw: $ =>
    // t_tikz: $ =>
    // t_tkcanvas: $ =>
    // t_webp: $ =>

    // termoption: $ =>

    theta: $ => seq('theta', optional(choice('right', 'top', 'left', 'bottom', 'clockwise', 'cw', 'counterclockwise', 'ccw'))),

    tics: $ => seq(/tics?/, repeat(choice(
      /axis|border/,
      /(no)?mirror/,
      /in|out/,
      /front|back/,
      seq(/(no)?rotate/, optional(seq('by', $._expression))),
      choice(seq('offset', field('offset', $._expression)), 'nooffset'),
      /l(e(f(t)?)?)?|r(i(g(t(h)?)?)?)?|c(e(n(t(e(r)?)?)?)?)?|au(t(o(j(u(s(t(i(f(y)?)?)?)?)?)?)?)?)?/,
      seq('format', $._expression),
      seq('font', $._expression), // string with font name and optional size
      /(no)?enhanced/,
      seq(/textcolor|tc/, choice($.colorspec, 'default')),
    ))),// p. 222

    // timestamp: $ =>

    timefmt: $ => seq('timefmt', field('format', $._expression)),

    title: $ => seq(/tit(l(e)?)?/,
      optional($._expression),
      optional(seq('offset', $._expression)),
      optional(seq('font', $._expression)), // string with font name and optional size
      optional(seq(/textcolor|tc/, choice($.colorspec, 'default'))),
      /(no)?enhanced/,
    ),

    version: $ => seq('version', optional('long')),

    vgrid: $ => seq('vgrid', '$', $.identifier, optional(seq('size', $._expression))),

    view: $ => prec.left(seq('view', repeat(choice(
      seq($._expression, optional(seq(',', $._expression, optional(seq(',', $._expression, optional(seq(',', $._expression))))))),
      seq('map', optional(seq('scale', $._expression))),
      seq('projection', optional(choice('xy', 'xz', 'yz'))),
      seq(/(no)?equal/, optional(choice('xy', 'xyz'))),
      seq('azimuth', $._expression)
    )))),

    walls: $ => seq('walls',
      optional(/(x0|y0|z0|x1|y1)/),
      optional($.fill_style),
      optional(seq(/fillcolor|fc/, $.colorspec)),
    ),

    xdata: $ => seq(/(x|y|z|x2|y2|cb)data/, optional('time')),

    xdtics: $ => /(x|y|z|z2|y2|cb)dtics/,

    xlabel: $ => seq(/(x|y|z|x2|y2|cb|r)lab(e(l)?)?/,
      optional(field('label', $._expression)),
      repeat(choice(
        seq('offset', alias($.position, $.offset)),
        choice('norotate', seq('rotate', choice(seq('by', $._expression), 'parallel'))),
        seq(/textcolor|tc/, $.colorspec),
        seq('font', field('font', $._expression)), // string with font name and optional size
        /(no)?enhanced/,
      ))
    ),

    xmtics: $ => /(x|y|z|x2|y2|cb)mtics/,

    xrange: $ => seq(/(x|y|z|x2|y2|r|t|u|v|cb|vx|vy|vz)ran(g(e)?)?/, optional($.range_block), repeat(choice( // HACK: optional(range_block) for unset command
      /(no)?reverse/,
      /(no)?writeback/,
      /(no)?extend/,
      'restore'
    ))),

    xtics: $ => prec.left(seq(/(x|y|z|x2|y2|cb|r)tics/, repeat(choice(
      /axis|border/,
      /(no)?mirror/,
      /in|out/,
      seq('scale', optional(choice('default', seq($._expression, optional(seq(',', $._expression)))))),
      seq(/(no)?rotate/, optional(seq('by', $._expression))),
      choice(seq('offset', field('offset', $._expression)), 'nooffset'),
      /left|right|center|autojustify/,
      'add',
      choice(
        'autofreq',
        $._expression,
        seq(field('start', $._expression), ',', field('incr', $._expression), optional(seq(',', field('end', $._expression)))),
        seq(
          '(',
          choice(
            field('pos', $._expression),
            seq(field('label', $._expression), field('pos', $._expression)),
            seq(field('label', $._expression), field('pos', $._expression), field('level', $._expression)),
          ),
          repeat(seq(',', choice(
            field('pos', $._expression),
            seq(field('label', $._expression), field('pos', $._expression)),
            seq(field('label', $._expression), field('pos', $._expression), field('level', $._expression)),
          ))),
          ')'
        )
      ),
      seq('format', $._expression),
      seq('font', $._expression), // string with font name and optional size
      /(no)?enhanced/,
      /numeric|timedate|geographic/,
      /(no)?logscale/,
      'rangelimited',
      seq(/textcolor|tc/, choice($.colorspec, 'default')),
    )))),

    xyplane: $ => seq('xyplane', optional(choice(seq('at', field('zval', $._expression)), seq('relative', field('val', $._expression))))),

    zero: $ => seq(/z(e(r(o)?)?)?/, $._expression),

    zeroaxis: $ => seq(/(x|x2|y|y2|z)?zeroa(x(i(s)?)?)?/, optional($._line_opts)),

    c_show: $ => prec.left(1, seq(/sh(o(w)?)?/, choice(
      $._argument_set_show,
      'colornames', 'functions',
      seq(/pal(e(t(t(e)?)?)?)?/, optional(choice(
        seq(/pal(e(t(t(e)?)?)?)?/, optional($._expression), optional(choice($.float, $.integer/*, $.hexadecimal*/))),
        /gra(d(i(e(n(t)?)?)?)?)?/, /fit2rgb(f(o(r(m(u(l(a(e)?)?)?)?)?)?)?)?/, /rgbfor(m(u(l(a(e)?)?)?)?)?/
      ))),
      /p(l(o(t)?)?)?/, /v(a(r(i(a(b(l(e(s)?)?)?)?)?)?)?)?/
    ))),

    c_splot: $ => seq(// TODO: p. 244
      /sp(lot)?/,
      repeat($.range_block),
      $.plot_element, // add voxelgrids to plot_element
      repeat(seq(',', $.plot_element)),
    ),

    c_stats: $ => seq('stats',
      field('ranges', repeat($.range_block)),
      field('filename', $._expression),
      optional(choice('matrix', repeat1($._i_e_u_directives))),
      repeat(choice(
        seq(choice('name', 'prefix'), $._expression),
        /(no)?o(ut)?(put)?/,
        seq('$vgridname', optional(seq('name', $._expression))),
      )),
    ),

    c_test: $ => prec.left(seq('test', optional(choice('test', 'terminal')))),

    c_undefine: $ => prec.left(seq(/und(e(f(i(n(e)?)?)?)?)?/, repeat($._expression))), // p. 253

    c_while: $ => seq(
      'while', '(', $._expression, ')',
      '{', repeat($._statement), '}',
    ),

    //-------------------------------------------------------------------------

    range_block: $ => seq(
      '[', optional(seq(alias($.identifier, $.dummy_var), '=')),
      optional($._expression), optional(':'),
      optional($._expression), ']'
    ),

    for_block: $ => seq(
      'for', '[',
      choice(
        seq($._expression, 'in', $._expression),
        seq(alias($.var_def, $.start), ':', alias($._expression, $.end), optional(seq(':', alias($._expression, $.incr)))),
      ),
      ']'
    ),

    sum_block: $ => prec.left(seq( // p. 53
      'sum', '[', $.identifier, '=', $._expression, ':', $._expression, ']', $._expression
    )),

    datafile_modifiers: $ => repeat1(
      choice(
        field('binary', seq('binary')), // add binary list
        field('matrix', seq(/(nonuniform|sparce)/, 'matrix')),
        $._i_e_u_directives,
        field('skip', seq('skip', field('N_lines', $._expression))),
        seq('smooth', optional($.smooth_options)),
        seq('bins'), // TODO: finish this p. 125
        'mask', 'convexhull', 'volatile', 'zsort', 'noautoscale',
      ),
    ),

    _arrow_opts: $ => prec.left(choice(
      field('as', seq(/arrowstyle|as/, $._expression)),
      choice('nohead', 'head', 'backhead', 'heads'),
      prec(2, seq( // FIX: precedence over plot_element
        'size', $._expression, ',', $._expression, optional(seq(',', $._expression))
      )),
      'fixed',
      choice('filled', 'empty', 'nofilled', 'noborder'),
      choice('front', 'back'),
      $._line_opts
    )),

    _label_opts: $ => prec(1, choice( // p. 178
      choice('norotate', seq('rotate', optional(seq('by', field('degrees', $._expression))))),
      seq('font', field('font', $._expression)), // string with font name and optional size
      /(no)?enhanced/,
      /front|back/,
      seq(/textcolor|tc/, $.colorspec),
      seq('offset', alias($.position, $.offset)),
      /l(e(f(t)?)?)?|r(i(g(h(t)?)?)?)?|c(e(n(t(e(r)?)?)?)?)?/,
      field('position', seq('at', $.position)),
      choice(seq('point', field('point', $._expression)), 'nopoint'),
      choice('nobox', seq('boxed', optional(field('bs', seq('bs', $._expression))))),
      'hypertext',
    )),

    _line_opts: $ => prec.left(repeat1(choice(
      field('ls', seq(/linestyle|ls/, $._expression)),
      field('lt', seq(/linetype|lt/, $._expression)),
      field('lw', seq(/linewidth|lw/, $._expression)),
      field('lc', seq(/linecolor|lc/, $.colorspec)),
      field('dt', seq(/dashtype|dt/, $._dash_opts)),
    ))),

    _line_style: $ => seq(field('tag', $._expression), repeat(choice(
      /def(a(u(l(t)?)?)?)?/,
      field('lt', seq(/linetype|lt/, $._expression)),
      field('lw', seq(/linewidth|lw/, $._expression)),
      field('lc', seq(/linecolor|lc/, $.colorspec)),
      field('dt', seq(/dashtype|dt/, $._dash_opts)),
      field('pt', seq(/pointtype|pt/, $._expression)),
      field('ps', seq(/pointsize|ps/, $._expression)),
      field('pi', seq(/pointinterval|pi/, $._expression)),
      field('pn', seq(/pointnumber|pn/, $._expression)),
      /pal(e(t(t(e)?)?)?)?/
    ))),

    fill_style: $ => seq(
      prec(1, choice(
      /empty/,
      seq(optional(/trans(p(a(r(e(n(t)?)?)?)?)?)?/), 'solid', optional(field('density', $._expression))),
      seq(optional(/trans(p(a(r(e(n(t)?)?)?)?)?)?/), 'pattern', field('pattern', $._expression), optional(field('n', $._expression))),
      )),
      optional(choice(seq('border', optional('lt'), optional(seq('lc', $.colorspec))), 'noborder')) // colorspec
    ),

    colorspec: $ => prec.left(choice(
      alias($.integer, $.tag),
      seq(/rgb(color)?/, $._expression),
      seq(/pal(e(t(t(e)?)?)?)?/, optional(choice(
        seq('frac', field('val', $._expression)),
        seq('cb', field('val', $._expression)),
        'z',
        // $.colormap // Named palette
      ))),
      'variable',
      'bgnd',
      'black'
    )),

    _i_e_u_directives: $ => choice(
      field('index', seq(/i(n(d(e(x)?)?)?)?/, choice(seq($._expression, optional(seq(':', $._expression)),optional(seq(':',$._expression))), field('name', $._expression)))),
      seq('every',
        optional(field('point_incr', $._expression)),
        optional(seq(':', optional(field('block_incr', $._expression)))),
        optional(seq(':', optional(field('start_point', $._expression)))),
        optional(seq(':', optional(field('start_block', $._expression)))),
        optional(seq(':', optional(field('end_point', $._expression)))),
        optional(seq(':', optional(field('end_block', $._expression)))),
      ),
      field('using', seq(/u(s(i(n(g)?)?)?)?/, $._expression, repeat(seq(':', $._expression)))),
    ),

    smooth_options: $ => choice(
      'unique', 'frequency', 'fnormal', 'cumulative', 'cnormal', 'csplines',
      'acsplines', 'mcsplines', 'path', 'bezier', 'sbezier',
      prec.left(seq('kdensity', optional(field('bandwidth_period', $._expression)))),
      prec.left(seq('convexhull', optional(field('expand', $._expression)))),
      'unwrap'
    ),

    position: $ => prec.left(seq(
      optional($.system), field('x', $._expression), ',', optional($.system), field('y', $._expression),
      optional(seq(',', optional($.system), field('z', $._expression))),
    )),

    system: $ => choice(/fir(s(t)?)?/, /sec(o(n(d)?)?)?/, /gr(a(p(h)?)?)?/, /sc(r(e(e(n)?)?)?)?/, /char(a(c(t(e(r)?)?)?)?)?/),
    //-------------------------------------------------------------------------
    _assignment: $ => choice(
      $.func_def,
      $.var_def,
      $.array_def,
    ),

    func_def: $ => seq($._function, '=', $._expression),

    var_def: $ => seq(alias($.identifier, $.var), '=', $._expression, repeat(seq('=', $._expression))),

    array_def: $ => choice(
      seq(
        'array',
        $.array,
        optional(seq('=','[', $._expression, repeat(seq(',', $._expression)), ']')),
      ),
      seq(
        field('name', $.identifier),
        '[', $._expression, ']','=', $._expression,
      ),
    ),

    _line_continuation: $ => seq('\\', '\n'),

    macro: $ => seq('@', $.identifier),

    //-------------------------------------------------------------------------

    _expression: $ => prec.left(choice(
      $._number,
      $._string_literal,
      $.array,
      $._function,
      $.sum_block,
      $.parenthesized_expression,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      $.identifier,
      $.macro,
    )),

    _number: $ => choice($.integer, $.float, $.complex),

    integer: $ => /\d+/,

    float: $ =>  /\d*(\.\d+)((e|E)(-|\+)?\d+)?/,

    complex: $ => seq('{', field('Re', $._expression), ',', field('Im', $._expression), '}'),

    _string_literal: $ => choice($.single_quoted_string, $.double_quoted_string),

    single_quoted_string: $ => token(seq("'", repeat(/[^']*/), "'")),

    double_quoted_string: $ => token(seq('"', repeat(/[^"]*/), '"')),

    array: $ => seq($.identifier, '[', $._expression, ']'),

    _function: $ => choice($.defined_func, $.builtin_func),

    defined_func: $ => prec(1, seq(alias($.identifier, $.name), $._arguments)),

    builtin_func: $ => seq($._gnuplot_builtin_func, $._arguments),

    _arguments: $ => prec(14, seq(
      '(', field('argument', alias($._expression, $.variable)), repeat(seq(',', field('argument', alias($._expression, $.variable)))), ')'
    )),

    _gnuplot_builtin_func: $ => prec(1, choice(
      'abs', 'acos', 'acosh', 'airy', 'arg', 'asin', 'asinh', 'atan', 'atan2',
      'atanh', 'besj0', 'besj1', 'besjn', 'besy0', 'besy1', 'besyn', 'besi0',
      'besi1', 'besin', 'cbrt', 'ceil', 'conj', 'cos', 'cosh', 'EllipticK',
      'EllipticE', 'EllipticPi', 'erf', 'erfc','exp', 'expint', 'floor', 'gamma',
      'ibeta', 'inverf', 'igamma', 'imag', 'int', 'invnorm', 'invibeta', 'invigamma',
      'LambertW', 'lambertw', 'lgamma', 'lnGamma', 'log', 'log10', 'norm', 'rand',
      'real', 'round', 'sgn', 'sin', 'sinh', 'sqrt', 'SynchrotronF', 'tan', 'tanh',
      'uigamma', 'voigt', 'zeta',
      // libcerf library
      'cerf', 'cdawson', 'faddeeva', 'erfi', 'FresnelC', 'FresnelS', 'VP', 'VP_fwhm',
      // Amos library
      'Ai', 'Bi', 'BesselH1', 'BesselH2', 'BesselJ', 'BesselY', 'BesselI', 'BesselK',
      // string functions
      'gprintf', 'sprintf', 'strlen', 'strstrt', 'substr', 'strptime',
      'strftime', 'system', 'trim', 'word', 'words',
      // time functions
      'time', 'timecolumn', 'tm_hour', 'tm_mday', 'tm_min', 'tm_mon', 'tm_sec',
      'tm_wday', 'tm_week', 'tm_yday', 'tm_year', 'weekday_iso', 'weekday_cdc',
      // other gnuplot functions
      'column', 'columnhead', 'exists', 'hsv2rgb', 'index', 'palette', 'rgbcolor',
      'stringcolumn', 'valid', 'value', 'voxel',
    )),

    parenthesized_expression: $ => prec(PREC.PAREN, seq('(', $._expression, ')')),

    unary_expression: $ => choice(
      prec.left(PREC.UNARY, seq('-', $._expression)),
      prec.left(PREC.UNARY, seq('+', $._expression)),
      prec.left(PREC.BIT_NOT, seq('~', $._expression)),
      prec.left(PREC.UNARY, seq('!', $._expression)),
      prec.left(PREC.POWER, seq($._expression, '!')),
      prec.left(PREC.UNARY, seq('$', $._expression)),
      prec.left(PREC.UNARY, seq('|', $._expression, '|')),
    ),

    binary_expression: $ => choice(
      prec.left(PREC.POWER, seq($._expression, '**', $._expression)),
      prec.left(PREC.TIMES, seq($._expression, '*', $._expression)),
      prec.left(PREC.TIMES, seq($._expression, '/', $._expression)),
      prec.left(PREC.TIMES, seq($._expression, '%', $._expression)),
      prec.left(PREC.PLUS, seq($._expression, '+', $._expression)),
      prec.left(PREC.PLUS, seq($._expression, '-', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '==', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '!=', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '<', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '<=', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '>', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '>=', $._expression)),
      prec.left(PREC.SHIFT, seq($._expression, '>>', $._expression)),
      prec.left(PREC.SHIFT, seq($._expression, '<<', $._expression)),
      prec.left(PREC.BIT_AND, seq($._expression, '&', $._expression)),
      prec.left(PREC.BIT_OR, seq($._expression, '^', $._expression)),
      prec.left(PREC.BIT_OR, seq($._expression, '|', $._expression)),
      prec.left(PREC.AND, seq($._expression, '&&', $._expression)),
      prec.left(PREC.OR, seq($._expression, '||', $._expression)),
      // prec.left(PREC.SHIFT, seq('(', $._expression, ',', $._expression, ')')), // serial evaluation
      prec.left(PREC.CONCAT, seq($._expression, '.', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, 'eq', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, 'ne', $._expression)),
    ),

    ternary_expression: $ => prec.left(PREC.TERNARY, seq($._expression, '?', $._expression, ':', $._expression)),

    identifier: $ => /\w+/,

    comment: $ => token(seq('#', /.*/, repeat(seq('\\\n', /.*/)))),
  }
});
