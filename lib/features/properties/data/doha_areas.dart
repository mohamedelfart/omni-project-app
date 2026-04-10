class DohaArea {
  final String name;
  final String imageUrl;
  final List<String> propertyIds;

  const DohaArea({
    required this.name,
    required this.imageUrl,
    required this.propertyIds,
  });
}

const List<DohaArea> dohaAreas = <DohaArea>[
  DohaArea(
    name: 'Doha',
    imageUrl:
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'The Pearl',
    imageUrl:
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>['PROP-001'],
  ),
  DohaArea(
    name: 'West Bay',
    imageUrl:
        'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>['PROP-002'],
  ),
  DohaArea(
    name: 'Lusail',
    imageUrl:
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>['PROP-003'],
  ),
  DohaArea(
    name: 'Al Sadd',
    imageUrl:
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>['PROP-004'],
  ),
  DohaArea(
    name: 'Al Wakra',
    imageUrl:
        'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>['PROP-005'],
  ),
  DohaArea(
    name: 'Al Wakrah',
    imageUrl:
        'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Msheireb',
    imageUrl:
        'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>['PROP-006'],
  ),
  DohaArea(
    name: 'Al Dafna',
    imageUrl:
        'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>['PROP-007'],
  ),
  DohaArea(
    name: 'Bin Mahmoud',
    imageUrl:
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Al Mansoura',
    imageUrl:
        'https://images.unsplash.com/photo-1600047509782-20d39509f26d?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Najma',
    imageUrl:
        'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Jabal Thuaileb',
    imageUrl:
        'https://images.unsplash.com/photo-1600566752734-8a6f8d4c6c10?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Al Rayyan',
    imageUrl:
        'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Al Gharrafa',
    imageUrl:
        'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Muraikh',
    imageUrl:
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Al Aziziyah',
    imageUrl:
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Ain Khaled',
    imageUrl:
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Muaither',
    imageUrl:
        'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Al Wukair',
    imageUrl:
        'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Madinat Khalifa',
    imageUrl:
        'https://images.unsplash.com/photo-1600047508788-786a2d4d34f5?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Umm Salal',
    imageUrl:
        'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
  DohaArea(
    name: 'Al Khor',
    imageUrl:
        'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1600&q=80',
    propertyIds: <String>[],
  ),
];

String? dohaAreaImageForName(String? areaName) {
  if (areaName == null || areaName.trim().isEmpty) {
    return null;
  }

  for (final DohaArea area in dohaAreas) {
    if (area.name.toLowerCase() == areaName.toLowerCase()) {
      return area.imageUrl;
    }
  }

  return null;
}
