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

// TODO: add gnuplot constants and functions

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
    [$.label],
    [$._expression],
    [$.style_opts],
    [$.palette],
    [$.xdata],
    [$.datafile_modifiers],
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
      // $.c_test,
      // $.c_toggle,
      // $.c_undefine,
      // $.c_vclear,
      // $.c_vfill,
      $.c_while,
    ),

    //-------------------------------------------------------------------------
    c_do: $ => seq(
      'do', $.for_block, '{', repeat($._statement), '}'
    ),

    c_eval: $ => seq('eval', $._expression),

    c_fit: $ => seq(
      'fit',
      optional($.range_block),
      field('func', $._function),
      field('data', $._expression),
      optional($.datafile_modifiers),
      optional(
        repeat1(choice(
          'unitweights',
          /(y|xy|z)err(or)?/,
          seq('errors', $._expression, optional(repeat1(seq(',', $._expression)))),
        )),
      ),
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

    c_plot: $ => choice(
      seq(
        /p(lot)?/,
        repeat($.range_block),
        $.plot_element,
        repeat(seq(',', $.plot_element)),
      ),
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
        choice(/not(it)?(tle)?/, field('title', seq(/t(it)?(le)?/, $._expression))), // TODO: p. 138-139
        choice(seq(/w(ith)?/, $.plot_style, optional($.style_opts)), $.style_opts) // TODO: p. 139-140
      )),
    )),

    plot_style: $ => choice(/l(ines)?/, /p(oints)?/, /lp|linespoints/, /financebars/,
      /dots/, /i(mpulses)?/, /lab(els)?/ /*p. 88*/, /sur(face)?/, /steps/, /fsteps/, /histeps/,
      /arr(ows)?/, /vec(tors)?/ /*p. 94*/, /(x|y|xy)errorbar/, /(x|y|xy)errorlines/, /parallelaxes/,
      // or
      /boxes/, /boxerrorbars/, /boxxyerror/, /isosurface/, /boxplot/, /candlesticks/,
      /circles/, /zerrorfill/, /ellipses/, /filledcurves/, /fillsteps/, /histograms/,
      /image/, /pm3d/, /rgbalpha/, /rgbimage/, /polygons/,
      // or
      /table/, /mask/
    ),

    style_opts: $ => repeat1(choice(
      field('ls', seq(/linestyle|ls/, $._expression)),
      field('lt', seq(/linetype|lt/, $._expression)),
      field('lw', seq(/linewidth|lw/, $._expression)),
      field('lc', seq(/linecolor|lc/, $.colorspec)),
      field('pt', seq(/pointtype|pt/, $._expression)),
      field('ps', seq(/pointsize|ps/, $._expression)),
      field('as', seq(/arrowstyle|as/, $._expression)),
      field('dt', seq(/dashtype|dt/, $.dash_opts)),
      field('fs', seq(/fill|fs/, $._expression)),
      field('fc', seq(/fillcolor|fc/, $.colorspec)),
      'nohidden3d', 'nocontours', 'nosurface', 'palette'
    )),

    c_print: $ => seq('print', $._expression, repeat(seq(',', $._expression))),

    c_replot: $ => /rep(lot)?/,

    c_reset: $ => seq('reset', optional(choice('bind', 'errors', 'session'))),

    c_set: $ => seq(
      choice(/se(t)?/, /uns(et)?/, /sh(ow)?/),
      $._argument_set_show,
    ),

    _argument_set_show: $ => choice(
      $.angles, $.arrow,
      $.border, $.boxwidth, $.boxdepth,
      $.color, $.colormap, $.colorsequence, $.clip, $.cntrlabel, $.cntrparam, $.colorbox, $.colornames, $.contour, $.cornerpoles,
      $.dashtype,
      $.datafile, $.decimalsign, $.dgrid3d,
      // $.dummy,
      $.encoding, $.errorbars,
      $.fit, $.format,
      $.grid,
      $.hidden3d,
      // $.history,
      $.isosamples, $.isosurface, $.isotropic,
      // $.jitter,
      $.key,
      $.label,
      // $.linetype,
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
      // $.pm3d, // p. 204
      // $.pointintervalbox,
      $.pointsize, $.polar,
      $.print,
      // $.psdir,
      $.raxis,
      // $.rgbmax,
      $.samples, $.size, $.spiderplot, $.style, $.surface,
      // $.table, // p. 220
      $.terminal,
      // $.termoption,
      $.theta, $.tics,
      // $.timestamp, // p. 224
      $.timefmt, $.title,
      // $.ttics // p. 226
      $.version, $.vgrid,
      // $.view, // p. 227
      $.walls,
      $.xdata, $.xdtics, $.xlabel, $.xmtics, $.xrange, $.xtics, $.xyplane,
      $.zeroaxis, // x|y|x2|y2|z
    ),

    angles: $ => seq(/an(gles)?/, optional(choice('degrees', 'radians'))),

    arrow: $ => prec.left(1, seq(/ar(row)?/, optional(repeat1(choice( // WARN: errores con graph y demás
      seq(
        optional($._expression),
        optional(seq('from', field('from', optional(choice($._expression, $.position))))),
        // optional(prec.right(2, seq(optional(','), choice($.position, $._expression)))),
        /(rto|to)/, field('to_rto', choice($._expression, $.position)),
        // optional(prec.right(2, seq(',', choice($.position, $._expression))))
      ),
      seq(
        optional($._expression),
        'from', field('from', $._expression),
        'length', field('lenght', $._expression),
        'angle',field('angle', $._expression )
      ),
      seq(/(arrowstyle|as)/, $._expression),
      /(nohead|head|backhead|heads)/,
      seq( 'size', $._expression, ',', $._expression, optional(seq(',', $._expression))),
      'fixed',
      /(filled|empty|nofilled|noborder)/,
      /front|back/,
      $.line_properties,
    ))))),

    border: $ => seq('border', optional(repeat1(choice(
      /(front|back|behind)/,
      $.line_properties,
      'polar',
    )))),

    boxwidth: $ => prec.left(1, seq('boxwidth', optional(repeat1(choice(
      field('width', $._expression),
      /absolute|relative/,
    ))))),

    boxdepth: $ => prec.left(1, seq('boxdepth', optional(repeat1(choice(
      field('y_extent', $._expression),
      'square'
    ))))),

    color: $ => 'color',

    colormap: $ => prec.left(1, seq('colormap', optional(choice(
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
      seq('levels',
        choice(
          $._expression,
          prec.left(1, seq('auto', optional($._expression))),
          prec.left(1, seq('discrete', $._expression, repeat(seq(',', $._expression)))),
          prec.left(1, seq('incremental', $._expression, ',', $._expression, optional(seq(',', $._expression)))),
        ),
        optional(/((un)?sorted)/),
        optional(seq('firstlinetype', $._expression)),
      ),
    ))),

    colorbox: $ => seq('colorbox', optional(repeat1(choice( // p. 155
      /vertical|horizontal/,
      /((no)?invert)/,
      /default|user/,
      /front|back/,
      choice(
        'noborder',
        'bdefault',
        seq('border', $._expression), //linestyle
      ),
      seq('cbtics', $._expression), //linestyle
    )))),

    colornames: $ => 'colornames',

    contour: $ => seq('contour', optional(choice('base', 'surface', 'both'))),

    cornerpoles: $ => 'cornerpoles',

    dashtype: $ => seq(/dashtype|dt/, field('tag',$._expression), $.dash_opts),

    dash_opts: $ => choice(
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

    datafile: $ => prec.left(1, seq(/dataf(ile)?/, optional(choice(
      'columnheaders',
      'fortran',
      'nofpe_trap',
      seq('missing', choice(field('string', $._expression), 'NaN')),
      seq(/sep(arator)?/, choice('whitespace', 'tab', 'comma', $._expression)), // chars
      seq('commentschars', optional(field('string', $._expression))),
      seq('binary', $._expression), // binary list pag 160 -> 118 -> 245
    )))),

    decimalsign: $ => prec.left(1, seq('decimalsign', choice($._expression, seq('locale', optional($._expression))))),

    dgrid3d: $ => prec.left(1, seq('dgrid3d', repeat1(choice( // p. 161
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

    encoding: $ => seq('encoding', choice(
        'default', /iso_8859_(1|15|2|9)/, /koi8(r|u)/, /cp(437|85(0|2)|950|125(0|1|2|4))/, 'sjis', 'utf8', 'locale'
    )),

    errorbars: $ => prec.left(1, seq('errorbars', repeat(choice(
      choice('small', 'large', 'fullwidth', field('size', $._expression)),
      choice('front', 'back'),
      $.line_properties
    )))),

    fit: $ => seq('fit', repeat1(choice(
      choice('nolog', seq('logfile', choice($._expression, 'default'))),
      choice(/(no)?quiet/, 'results', 'brief', 'verbose'),
      choice(/(no)?errorvariables/),
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

    format: $ => seq('format', optional(/(x|y|xy|x2|y2|z|cb)/), field('fmt_str', $._expression), /(numeric|timedate|geographic)/ ),

    grid: $ => seq('grid'), // TODO: complete
    /*
      {{no}{m}xtics} {{no}{m}ytics} {{no}{m}ztics}
      {{no}{m}x2tics} {{no}{m}y2tics} {{no}{m}rtics}
      {{no}{m}cbtics}
      {polar {<angle>}}
      {layerdefault | front | back}
      {{no}vertical}
      {<line-properties-major> {, <line-properties-minor>}}
    */

    hidden3d: $ => seq('hidden3d', optional(choice(
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

    // history: $ =>

    isosamples: $ => seq(/iso(samples)?/, $._expression, optional(seq(',', $._expression))),

    isosurface: $ => seq(/isosurf(ace)?/, optional(choice('mixed', 'triangles')), optional(choice('noinsidecolor', seq('insidecolor', $._expression)))),

    isotropic: $ => 'isotropic',

    // jitter: $ =>

    key: $ => seq(/k(ey)?/, repeat(choice(
      /(on|off)/,
      'default',
      /(no)?enhanced/,
      seq(/(no)?autoti(tle)?/, optional('columnheader')),
      seq(/(no)?box/, optional($.line_properties)),
      seq(/(no)?opaque/, optional(seq('fc', $.colorspec))),
      seq('width', field('increment', $._expression)),
      seq('height', field('increment', $._expression)),
      // layout
      /vertical|horizontal/,
      seq('maxcols', optional(choice($._expression, 'auto'))),
      seq('maxrows', optional(choice($._expression, 'auto'))),
      seq('columns', $._expression),
      seq('keywidth', choice('screen', 'graph'), $._expression),
      /Left|Right/,
      /(no)?(reverse|invert)/,
      seq('samplen', field('length', $._expression)),
      seq('spacing', field('spacing', $._expression)),
      seq(/t(it)?(le)?/, optional($._expression), optional(/(no)?enhanced/), optional(/(c(enter)?|l(eft)?|r(ight)?)/)),
      seq('font', field('face_size', $._expression)),
      seq('textcolor', $.colorspec),
      // placement
      /(inside|outside|fixed)/,
      /(l|r|t|b)m(argin)?/,
      seq('at', $.position),
      /l(eft)?|r(ight)?|c(enter)?/, /t(op)?|b(ottom)?|c(enter)?/,
    ))),

    label: $ => prec.left(1, seq(/lab(el)?/, seq( // p. 168 WARN: error con el texto cuando es función
      field('tag', optional(choice($.integer, $.identifier))),
      prec(1, field('text', optional($._label_text))),
      optional(field('position', seq('at', $.position))),
      optional(/l(eft)?|r(ight)?|c(enter)?/),
      optional(choice('norotate', seq('rotate', optional(seq('by', field('degrees', $._expression)))))),
      optional(/front|back/),
      optional(seq(/textcolor|tc/, $.colorspec)),
      optional(choice(seq('point', field('point', $._expression)), 'nopoint')),
      optional(seq('offset', field('offset', $._expression))),
      optional(choice('nobox', seq('boxed', optional(field('bs', seq('bs', $._expression)))))),
      optional('hypertext'),
    ))),

    // linetype: $ =>

    // link: $ =>

    // loadpath: $ =>

    locale: $ => prec.left(1, seq('locale', optional(field('locale', $._expression)))),

    logscale: $ => seq('logscale', repeat(seq(/(x|y|z|x2|y2|cb|r)/, optional(field('base', $._expression))))),

    mapping: $ => seq('mapping', choice('cartesian', 'spherical', 'cylindrical')),

    margin: $ => prec.left(1, seq(/(l|r|t|b)?m(argin)?s?/, optional(choice(
      seq(optional('at screen'), $._expression),
      seq(field('lm', $._expression), ',', field('rm', $._expression), ',', field('bm', $._expression), ',', field('tm', $._expression)),
    )))),

    micro: $ => 'micro', // NOTE: experimental p. 184

    minussign: $ => 'minussign', // NOTE: experimental p. 184

    monochrome: $ => seq('monochrome',
      // {linetype N <linetype properties>}
    ), // NOTE: p. 185

    mouse: $ => seq('mouse',
      /*
      {doubleclick <ms>} {nodoubleclick}
      {{no}zoomcoordinates}
      {zoomfactors <xmultiplier>, <ymultiplier>}
      {noruler | ruler {at x,y}}
      {polardistance{deg|tan} | nopolardistance}
      {format <string>}
      {mouseformat <int> | <string> | function <f(x,y)>}
      {{no}labels {"labeloptions"}}
      {{no}zoomjump} {{no}verbose}
       */
    ),

    multiplot: $ => seq('multiplot', repeat(choice(
      seq(/t(it)?(le)?/, field('title', $._expression), optional(seq('font', field('font', $._expression))), optional(/(no)?enhanced/)),
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

    mxtics: $ => prec.left(1, seq(/m(x|y|z|x2|y2|r|t|cb)tics/, optional(choice( // p. 190
      field('freq', $._expression),
      'default',
      seq(field('N', $._expression), field('units', choice('seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'))),
    )))),

    // nonlinear: $ =>

    // object: $ =>

    // offsets: $ =>

    // origin: $ =>

    output: $ => seq(/o(ut)?(put)?/, field('name', $._expression)),

    overflow: $ => seq('overflow', choice('float', 'NaN', 'undefined')),

    palette: $ => seq('palette', repeat(choice(
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

    parametric: $ => 'parametric',

    // paxis: $ =>

    // pixmap: $ =>
    /*
      <index> {"filename" | colormap <name>}
              at <position>
              {width <w> | height <h> | size <w>,<h>}
              {front|back|behind} {center}
    */
    // pm3d: $ =>
    /*
      {
        { at <position> }
        { interpolate <steps/points in scan, between scans> }
        { scansautomatic | scansforward | scansbackward
                        | depthorder {base} }
        { flush { begin | center | end } }
        { ftriangles | noftriangles }
        { clip {z} | clip1in | clip4in }
        { {no}clipcb }
        { corners2color
          { mean|geomean|harmean|rms|median|min|max|c1|c2|c3|c4 }
        }
        { {no}lighting
          {primary <fraction>} {specular <fraction>} {spec2 <fraction>}
        }
        { {no}border {retrace} {<linestyle-options>}}
        { implicit | explicit }
        { map }
      }
    */

    // pointintervalbox: $ =>

    pointsize: $ => seq('pointsize', field('multiplier', $._expression)),

    polar: $ => 'polar',

    print: $ => seq('print', $._expression), // TODO: complete

    // psdir: $ =>

    raxis: $ => 'raxis',

    // rgbmax: $ =>

    samples: $ => seq(/sam(ples)?/, $._expression, optional(seq(',', $._expression))),

    size: $ => seq('size', choice(
      choice(/(no)?square/, seq('ratio', $._expression), 'noratio'),
      seq(field('xscale', $._expression), ',', field('yscale', $._expression)),
    )),

    spiderplot: $ => 'spiderplot',

    style: $ => seq('style', choice( // TODO: complete p. 212
      seq('arrow'), // p. 213
      seq('boxplot'), // p. 214
      seq('data', $.plot_style),
      seq('fill',
        prec(1, optional(choice(
          /empty/,
          seq(optional(/trans(parent)?/), 'solid', optional(field('density', $._expression))),
          seq(optional(/trans(parent)?/), 'pattern', field('pattern', $._expression), optional(field('n', $._expression))),
        ))),
        optional(choice(seq('border', optional('lt'), optional(seq('lc', $.colorspec))), 'noborder')) // colorspec
      ),
      seq('function', $.plot_style),
      seq('increment', optional(/default|userstyles/)),
      seq('line'), // p. 217
      seq('circle'), // p. 218
      seq('rectangle'), // p. 218
      seq('ellipse'), // p. 219
      seq('parallelaxis', optional(/front|back/), optional($.line_properties)),
      seq('spiderplot'), // p. 219
      seq('textbox') // p. 220
    )),

    surface: $ => seq('surface', optional(choice('implicit', 'explicit'))),

    // table: $ =>

    terminal: $ => seq(/ter(m)?(inal)?/, optional(choice($._terminal_type, 'push', 'pop'))),

    _terminal_type: $ => choice(
      $.t_cairolatex,
      // $.t_canvas,
      // $.t_cgm,
      // $.t_context,
      // $.t_domterm,
      // $.t_dumb,
      // $.t_dxf,
      // $.t_emf,
      // $.t_epscairo,
      $.t_epslatex,
      // $.t_fig,
      // $.t_gif,
      // $.t_hpgl,
      // $.t_jpeg,
      // $.t_lua,
      // $.t_pcl5,
      // $.t_pdfcairo,
      // $.t_png,
      // $.t_pngcairo,
      // $.t_postscript,
      // $.t_pslatex, // pslatex, pstex
      // $.t_pstricks,
      // $.t_qt,
      // $.t_sixelgd,
      // $.t_svg,
      // $.t_tek4xxx, // tek40xx, tek410x
      // $.t_texdraw,
      // $.t_tikz,
      // $.t_tkcanvas,
      // 'unknown',
      // $.t_webp
    ),

    dimension: $ => seq($._number, /cm|in/),

    t_cairolatex: $ => seq(/cai(ro)?(latex)?/, repeat(choice(
      choice('eps', 'pdf', 'png'),
      choice('standalone', 'input'),
      choice('blacktext', 'colortext', 'colourtext'),
      choice(seq('header', field('header', $._expression)), 'noheader'),
      choice('mono', 'color'),
      /(no)?transparent/,
      /(no)?crop/,
      seq('background', field('color', $._expression)),
      seq('font', field('font', $._expression)),
      seq('fontscale', field('scale', $._expression)),
      seq(/lw|linewidth/, field('lw', $._expression)),
      choice('rounded', 'butt', 'square'),
      seq(/dl|dashlength/, field('dl', $._expression)),
      seq('size', field('xsize', $.dimension), ',', field('ysize', $.dimension)),
      seq('resolution', field('dpi', $._expression)),
    ))),

    t_epslatex: $ => seq(/epsl(atex)?/, repeat(choice( // TODO: finish it
      seq('size', field('xsize', $.dimension), ',', field('ysize', $.dimension)),
    ))),

    // termoption: $ =>

    theta: $ => seq('theta', optional(choice('right', 'top', 'left', 'bottom', 'clockwise', 'cw', 'counterclockwise', 'ccw'))),

    tics: $ => seq('tics', repeat(choice(
      /axis|border/,
      /(no)?mirror/,
      /in|out/,
      /front|back/,
      seq(/(no)?rotate/, optional(seq('by', $._expression))),
      choice(seq('offset', field('offset', $._expression)), 'nooffset'),
      /left|right|center|autojustify/,
      seq('format', $._expression),
      seq('font', $._expression), // string with font name and optional size
      /(no)?enhanced/,
      seq(/textcolor|tc/, choice($.colorspec, 'default')),
    ))),// p. 222

    // timestamp: $ =>

    timefmt: $ => seq('timefmt', field('format', $._expression)),

    title: $ => seq(/t(it)?(le)?/,
      optional($._expression),
      optional(seq('offset', $._expression)),
      optional(seq('font', $._expression)), // string with font name and optional size
      optional(seq(/textcolor|tc/, choice($.colorspec, 'default'))),
      /(no)?enhanced/,
    ),

    version: $ => seq('version', optional('long')),

    vgrid: $ => seq('vgrid', '$', $.identifier, optional(seq('size', $._expression))),

    // view: $ =>

    walls: $ => seq('walls',
      optional(/(x0|y0|z0|x1|y1)/),
      /*optional($.fillstyle),*/  // TODO: add fillstyle
      optional(seq(/fillcolor|fc/, $.colorspec)),
    ),

    xdata: $ => seq(/(x|y|z|x2|y2|cb)data/, optional('time')),

    xdtics: $ => /(x|y|z|z2|y2|cb)dtics/,

    xlabel: $ => prec.left(1, seq(/(x|y|z|x2|y2|cb|r)lab(el)?/, repeat(choice(
      field('label', $._expression),
      seq('offset', field('offset', $._expression)),
      seq('font', field('font', $._expression)), // string with font name and optional size
      seq(/textcolor|tc/, $.colorspec),
      /(no)?enhanced/,
      choice('norotate', seq('rotate', choice(seq('by', $._expression), 'parallel'))),
    )))),

    xmtics: $ => /(x|y|z|x2|y2|cb)mtics/,

    xrange: $ => seq($.range_block, /(x|y|z|x2|y2|r|t|u|v|cb|vx|vy|vz)ran(ge)?/, repeat(choice(
      /(no)?reverse/,
      /(no)?writeback/,
      /(no)?extend/,
      'restore'
    ))),

    xtics: $ => prec.left(1, seq(/(x|y|z|x2|y2|cb|r)tics/, repeat(choice(
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
        // TODO: add ({"<label>"} <pos> {<level>} {,{"<label>"}...)
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

    zeroaxis: $ => seq(/(x|x2|y|y2|z)?zeroaxis/, optional($.line_properties)),

    c_show: $ => prec.left(1, seq(/sh(ow)?/, choice(
      'colornames', 'functions',
      seq('palette', optional(choice(
        seq('palette', optional($._expression), optional(choice($.float, $.integer/*, $.hexadecimal*/))),
        'gradient', 'fit2rgbformulae', 'rgbformulae'))),
      'plot', 'variables'
    ))),

    c_splot: $ => seq(// TODO: p. 244
      /sp(lot)?/,
      repeat($.range_block),
      $.plot_element, // voxelgrids to plot_element
      repeat(seq(',', $.plot_element)),
    ),

    c_stats: $ => seq('stats', // p. 250
      choice(
        seq(
          field('ranges', repeat($.range_block)),
          field('filename', $._expression),
          optional(choice(
            'matrix',
            seq(/u(sing)?/, $._expression, optional(seq(':', $._expression))),
          )),
          optional(seq('name', $._expression)),
          optional(/(no)?o(ut)?(put)?/),
        ),
        seq('$vgridname', optional(seq('name', $._expression))),
      ),
    ),

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

    sum_block: $ => prec.left(1, seq( // p. 53
      'sum', '[', $.identifier, '=', $._expression, ':', $._expression, ']', $._expression
    )),

    datafile_modifiers: $ => repeat1(
      choice(
        field('binary', seq('binary')), // add binary list
        field('matrix', seq(/(nonuniform|sparce)/, 'matrix')),
        field('index', seq(/i(ndex)?/, choice(seq($._expression, optional(seq(':', $._expression)),optional(seq(':',$._expression))), $._expression))),
        seq('every',
          optional(field('point_incr', $._expression)),
          optional(seq(':', optional(field('block_incr', $._expression)))),
          optional(seq(':', optional(field('start_point', $._expression)))),
          optional(seq(':', optional(field('start_block', $._expression)))),
          optional(seq(':', optional(field('end_point', $._expression)))),
          optional(seq(':', optional(field('end_block', $._expression)))),
        ),
        field('skip', seq('skip', field('N_lines', $._expression))),
        field('using', seq(/u(sing)?/, $._expression, repeat(seq(':', $._expression)))),
        seq('smooth', optional($.smooth_options)),
        seq('bins'), // TODO: finish this p. 125
        'mask', 'convexhull', 'volatile', 'zsort', 'noautoscale',
      ),
    ),

    line_properties: $ => prec.left(1, repeat1(choice(
      field('ls', seq(/linestyle|ls/, $._expression)),
      field('lt', seq(/linetype|lt/, $._expression)),
      field('lw', seq(/linewidth|lw/, $._expression)),
      field('lc', seq(/linecolor|lc/, $.colorspec)),
      field('dt', seq(/dashtype|dt/, $.dash_opts)),
    ))),

    smooth_options: $ => choice(
      'unique', 'frequency', 'fnormal', 'cumulative', 'cnormal', 'csplines',
      'acsplines', 'mcsplines', 'path', 'bezier', 'sbezier',
      prec.left(1, seq('kdensity', optional(field('bandwidth_period', $._expression)))),
      prec.left(1, seq('convexhull', optional(field('expand', $._expression)))),
      'unwrap'
    ),

    position: $ => seq($._expression, ',', $._expression, optional(seq(',', $._expression))),
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

    _expression: $ => prec.left(0,
      choice(
        $._number,
        $._string_literal,
        $.array,
        // $.colorspec,
        // $.position,
        $._function,
        $.sum_block,
        $.parenthesized_expression,
        $.unary_expression,
        $.binary_expression,
        $.ternary_expression,
        $.identifier,
    )),

    _label_text: $ => choice(
      $._string_literal,
      $.identifier,
      // p 67, 43, 166
    ),

    _number: $ => choice($.integer, $.float, $.complex),

    integer: $ => /\d+/,

    float: $ =>  /\d*(\.\d+)((e|E)(-|\+)?\d+)?/,

    complex: $ => seq('{', alias(choice($.integer, $.float), $.Re), ',', alias(choice($.integer, $.float), $.Im), '}'),

    _string_literal: $ => choice($.single_quoted_string, $.double_quoted_string),

    single_quoted_string: $ => token(seq("'", repeat(/[^']*/), "'")),

    double_quoted_string: $ => token(seq('"', repeat(/[^"]*/), '"')),

    array: $ => prec.left(1, seq($.identifier, '[', $._expression, ']')),

    colorspec: $ => prec.left(0, choice(
      seq(/rgb(color)?/, $._expression),
      seq('palette', choice(
        seq('frac', field('val', $._expression)),
        seq('cb', field('val', $._expression)),
        'z',
        // $.colormap // Named palette
      )),
      'variable',
      'bgnd',
      'black'
    )),

    position: $ => prec.right(1, seq(
      optional(/first|second|polar|graph|screen|character/),
      field('x', $._expression),',', field('y', $._expression),
      optional(seq(',', field('z', $._expression))))),

    _function: $ => choice($.defined_func, $.builtin_func),

    defined_func: $ => seq(field('name', $.identifier), $._arguments),

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
