import json,sys,shapely
from shapely.geometry import shape
from shapely.ops import unary_union
path=sys.argv[1]
x=json.load(open(path))['result'];factor=x['provenance']['areaFactor']
mask=unary_union([shape({'type':'MultiPolygon','coordinates':g}) for g in x['maskGeometries'].values()])
max_difference=0
for l in x['localities']:
 full=shape({'type':'MultiPolygon','coordinates':l['fullGeometry']});overlap=full.intersection(mask)
 area=overlap.area*factor/1000;max_difference=max(max_difference,abs(area-l['overlapAreaDaa']))
 assert abs(area-l['overlapAreaDaa'])<0.00001,(l['id'],area,l['overlapAreaDaa'])
 assert full.is_valid,l['id']
 assert abs(full.area*factor/1000-l['totalAreaDaa'])<0.00001,l['id']
unique=unary_union([shape({'type':'MultiPolygon','coordinates':l['overlapGeometry']}) for l in x['localities']])
assert abs(unique.area*factor/1000-x['uniqueAreaDaa'])<0.00001
for t in x['types']:
 union=unary_union([shape({'type':'MultiPolygon','coordinates':l['overlapGeometry']}) for l in x['localities'] if l['natureType']==t['label']])
 assert abs(union.area*factor/1000-t['areaDaa'])<0.00001,t['label']
assigned=None
for v in x['values']:
 union=unary_union([shape({'type':'MultiPolygon','coordinates':l['overlapGeometry']}) for l in x['localities'] if l['value']==v['label']])
 winning=union if assigned is None else union.difference(assigned)
 assert abs(winning.area*factor/1000-v['areaDaa'])<0.00001,v['label']
 assigned=union if assigned is None else assigned.union(union)
r={'shapely':shapely.__version__,'GEOS_uniqueAreaDaa':unique.area*factor/1000,'maxLocalityAreaDifferenceDaa':max_difference,'localities':len(x['localities']),'validMask':mask.is_valid,'allValueAndNatureTypeAreasVerified':True}
print(json.dumps(r,indent=2));open(path.replace('result.json','geos-verification.json'),'w').write(json.dumps(r,indent=2))
