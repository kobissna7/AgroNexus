import 'package:flutter/material.dart';

/// Ported 1:1 from web/src/components/CropIcon.tsx — same SVG paths, same
/// 24x24 viewBox, same 1.5 stroke weight, round caps/joins. Replaces the
/// emoji crop glyphs so mobile renders the identical mark as web.
class CropIcon extends StatelessWidget {
  final String type;
  final double size;
  final Color? color;
  const CropIcon(this.type, {super.key, this.size = 24, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? IconTheme.of(context).color ?? Colors.black;
    return CustomPaint(
      size: Size(size, size),
      painter: _CropIconPainter(type.toLowerCase(), c),
    );
  }
}

class _CropIconPainter extends CustomPainter {
  final String type;
  final Color color;
  _CropIconPainter(this.type, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 24;
    canvas.scale(scale);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final thin = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8
      ..strokeCap = StrokeCap.round;

    switch (type) {
      case 'maize':
        final cob = Path()
          ..moveTo(9.5, 5)
          ..cubicTo(9.5, 3, 14.5, 3, 14.5, 5)
          ..lineTo(14.5, 17)
          ..cubicTo(14.5, 19, 9.5, 19, 9.5, 17)
          ..close();
        canvas.drawPath(cob, paint);
        canvas.drawLine(const Offset(9.5, 9), const Offset(14.5, 9), thin);
        canvas.drawLine(const Offset(9.5, 12), const Offset(14.5, 12), thin);
        canvas.drawLine(const Offset(9.5, 15), const Offset(14.5, 15), thin);
        canvas.drawPath(Path()..moveTo(9.5, 8)..cubicTo(7, 6, 4, 8, 6, 12), paint);
        canvas.drawPath(Path()..moveTo(14.5, 8)..cubicTo(17, 6, 20, 8, 18, 12), paint);
        break;

      case 'tomatoes':
        canvas.drawCircle(const Offset(12, 14), 6, paint);
        canvas.drawLine(const Offset(12, 8), const Offset(12, 5), paint);
        canvas.drawPath(Path()..moveTo(9.5, 7)..cubicTo(9, 4, 11, 5, 12, 5), paint);
        canvas.drawPath(Path()..moveTo(14.5, 7)..cubicTo(15, 4, 13, 5, 12, 5), paint);
        break;

      case 'plantain':
        canvas.drawPath(
          Path()
            ..moveTo(5, 19)
            ..cubicTo(5, 16, 7, 11, 11, 8)
            ..cubicTo(14, 5, 18, 5, 19, 8)
            ..cubicTo(20, 11, 18, 15, 14, 18),
          paint,
        );
        canvas.drawPath(
          Path()
            ..moveTo(7, 20)
            ..cubicTo(7, 17, 9, 13, 12, 10.5)
            ..cubicTo(14.5, 8, 17.5, 8, 18.5, 10.5),
          paint,
        );
        canvas.drawLine(const Offset(11, 8), const Offset(9.5, 5), paint);
        break;

      case 'cassava':
        canvas.drawPath(Path()..moveTo(12, 2)..cubicTo(10, 3, 8, 5, 9, 8), paint);
        canvas.drawPath(Path()..moveTo(12, 2)..cubicTo(14, 3, 16, 5, 15, 8), paint);
        canvas.drawOval(Rect.fromCenter(center: const Offset(12, 10), width: 6, height: 4), paint);
        canvas.drawPath(Path()..moveTo(9, 12)..cubicTo(8, 15, 7, 18, 8, 21), paint);
        canvas.drawLine(const Offset(12, 12), const Offset(12, 22), paint);
        canvas.drawPath(Path()..moveTo(15, 12)..cubicTo(16, 15, 17, 18, 16, 21), paint);
        break;

      case 'pepper':
        canvas.drawPath(
          Path()
            ..moveTo(12, 5)
            ..cubicTo(14.5, 5, 17, 8, 17, 12)
            ..cubicTo(17, 17, 14.5, 21, 12, 21)
            ..cubicTo(9.5, 21, 7, 17, 7, 12)
            ..cubicTo(7, 8, 9.5, 5, 12, 5)
            ..close(),
          paint,
        );
        canvas.drawLine(const Offset(12, 5), const Offset(12, 2), paint);
        canvas.drawPath(Path()..moveTo(12, 3)..cubicTo(13, 1, 16, 2, 14.5, 4), paint);
        break;

      case 'rice':
        canvas.drawLine(const Offset(4, 11), const Offset(20, 11), paint);
        canvas.drawPath(
          Path()
            ..moveTo(4, 11)
            ..cubicTo(4, 16, 8, 20, 12, 20)
            ..cubicTo(16, 20, 20, 16, 20, 11),
          paint,
        );
        _rotatedEllipse(canvas, paint, const Offset(8.5, 8), 1.5, 0.8, -30);
        canvas.drawOval(Rect.fromCenter(center: const Offset(12, 7), width: 3, height: 1.6), paint);
        _rotatedEllipse(canvas, paint, const Offset(15.5, 8), 1.5, 0.8, 30);
        break;

      default:
        canvas.drawPath(
          Path()
            ..moveTo(12, 22)
            ..lineTo(12, 12)
            ..cubicTo(12, 8, 16, 4, 19, 6)
            ..cubicTo(20, 10, 17, 14, 12, 12)
            ..cubicTo(12, 8, 8, 4, 5, 6)
            ..cubicTo(4, 10, 7, 14, 12, 12),
          paint,
        );
    }
  }

  void _rotatedEllipse(Canvas canvas, Paint paint, Offset center, double rx, double ry, double degrees) {
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(degrees * 3.1415926535 / 180);
    canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: rx * 2, height: ry * 2), paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _CropIconPainter oldDelegate) =>
      oldDelegate.type != type || oldDelegate.color != color;
}
