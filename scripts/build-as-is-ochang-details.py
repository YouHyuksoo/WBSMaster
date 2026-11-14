"""
@file scripts/build-as-is-ochang-details.py
@description 오창 원본 PPTX·XLSX에서 출처를 보존한 단위업무 입력 자료를 생성합니다.
초보자 가이드:
- 실행은 DB를 변경하지 않습니다. 원본 파일도 변경하지 않습니다.
- 매뉴얼의 화면 설명과 명시된 단계만 수집하며 개발 예정 기능은 이슈로 분리합니다.
- 생성 JSON은 import-as-is-ochang-details.ts가 백업 후 추가 입력합니다.
"""
from pathlib import Path
import hashlib, json, re, zipfile, xml.etree.ElementTree as ET
import openpyxl

ROOT = Path('C:/Project/poll')
NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
TAG = '[문서보완 2026-11-13]'
sources, units = {}, {}
REVIEWED_HASHES = {
 '0.':'a9a725c5bbd5b7d852cd56c3822fe0920a3bd80e01588ffaeeb9a03842e4e3c3',
 '2.':'e85587b1f48dc8a3939f54910865d24f647d2e0a300a4831ab3c8211759699f5',
 '3.':'f7d173afbdab69ccbd6a7d5e1d6bb4b0924c65eb65018e180fc1ffc31a015ffd',
 '4.':'fb3ab36c5ea5be50f3db3d99ae1a604a4769a3fa8809f80a24cb8121d8896efe',
 '8.':'d44ffab7ca129421536885291cee03e182e930b4de2be3e6060a1f88ae663f5b',
 'POP':'48d6efa71e019baa37acf61be94ee8d5fb998fc692dd88546b215d484b35d911',
 'RFP':'a81d75f6531147234c8dbcfbde3b94d504304a412df9ee23892ba88f07d1cfd4',
 'LIST':'c6b9822342be9def39aead931259b02d9acf7701e000955e94b160310e4e1264',
}

for path in ROOT.glob('*.pptx'):
    if not (path.name.startswith('2025-03-18') or path.name.startswith('2026-09-27')):
        continue
    key = next((k for k in ['POP', '0.', '2.', '3.', '4.', '8.'] if k in path.name), 'RFP')
    if hashlib.sha256(path.read_bytes()).hexdigest() != REVIEWED_HASHES[key]:
        raise ValueError(f'검토한 원본이 변경됨. 슬라이드 대응표 재검토 필요: {path.name}')
    with zipfile.ZipFile(path) as archive:
        slides = {}
        for name in archive.namelist():
            match = re.fullmatch(r'ppt/slides/slide(\d+)\.xml', name)
            if match:
                xml = ET.fromstring(archive.read(name))
                slides[int(match[1])] = [text for p in xml.findall('.//a:p', NS)
                    if (text := ''.join(t.text or '' for t in p.findall('.//a:t', NS)).strip())]
        sources[key] = {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                        'date': '2026-09-27' if key == 'RFP' else '2025-01-09', 'slides': slides}

def unit(number):
    return units.setdefault(number, {})

def add(number, section, row):
    rows = unit(number).setdefault(section, [])
    rows.append({**row, 'order': len(rows)})

def reference(key, slide):
    s = sources[key]
    return (f"{TAG} 출처: {s['file']} / 슬라이드 {slide} / 문서 기준일 {s['date']}. "
            '문서 기재 기준이며 현재 운영 적용 상태는 별도 확인 필요.')

def contents(key, slide):
    return sources[key]['slides'][slide]

# 화면 단위로 직접 확인한 매뉴얼 위치. 총괄 번호는 기존 OC-AS-001~043을 따른다.
mapping = {
    '0.': {1:[5,7,8,9,11], 2:[6,12,13,14,15], 3:[10], 4:[20,21,22,23,24],
           5:[25,26], 6:[27], 7:[28,29], 26:[31,32,33,34,35,36], 28:[38,39,40],
           32:[42], 41:[43], 42:[17,18]},
    '2.': {9:[7], 11:[4], 12:[6], 13:[8]},
    '3.': {14:[4], 28:[5], 15:[6], 18:[10,11], 19:[8,9,12,13,16], 27:[14], 24:[15]},
    '4.': {21:[5], 22:[6,7]}, '8.': {29:[5]},
    'POP': {13:[4,5], 16:[6,7,8], 17:[7], 23:[9,10,11]},
}
pop_titles = {4:'호기별 근무등록 - 근무 내역 조회',5:'호기별 근무등록 - 근무 등록',
              6:'생산보고',7:'생산보고 - 실적 및 불량 보고',8:'생산보고 - 채움설정 및 재고이동',
              9:'외관 보고',10:'외관보고 - 양품보고',11:'외관보고 - 불량보고'}

for key, groups in mapping.items():
    for number, pages in groups.items():
        for slide in pages:
            parts = contents(key, slide)
            title = next((p for p in parts if re.match(r'^\d+(?:\.\d+)+\.?\s*\D', p)), None)
            title = re.sub(r'^\d+(?:\.\d+)*\.?\s*', '', title or parts[0]).strip()
            if key == 'POP':
                title = pop_titles[slide]
            description = '\n'.join(p for p in parts if p != 'Description' and len(p) > 3)
            ref = reference(key, slide)
            if '개발' in description and ('예정' in description):
                add(number, 'issues', {'issueType':'OTHER', 'title':f'문서상 개발 예정: {title}',
                    'description':description, 'remarks':ref+' 이후 개발·적용 여부 미확인.'})
                continue
            # 자동 실적은 POP 7쪽에 명시된 한 문장만 인용한다. 수동보고 화면은 OC-AS-016에 둔다.
            if number == 17:
                add(number, 'functions', {'functionName':'융착 자동 실적 보고', 'module':'POP / 자동실적',
                    'description':'현재 조립(융착)은 자동으로 실적 보고됨(LOT 생성~실적보고 단계).', 'remarks':ref})
                continue
            add(number, 'functions', {'functionName':title, 'module':'POP' if key=='POP' else 'MES',
                                      'description':description, 'remarks':ref})
            add(number, 'screens', {'screenName':title, 'screenType':'POP' if key=='POP' else '관리자 UI',
                'description':description, 'relatedFunction':title, 'remarks':ref+' 화면 ID·정확한 메뉴 경로는 미확인.'})

# 순서가 명시된 화면에만 선형 흐름도를 작성한다. 별개의 조회/등록 절차는 섞지 않는다.
flows = [
 (1,'0.',7,['코드 그룹 목록 확인','코드 그룹 선택','상세 코드값 확인·변경']),
 (2,'0.',14,['조회할 사용자쿼리 버전 선택','Data Viewer에서 쿼리 내용 확인']),
 (3,'0.',10,['ERP 연계 위치 정보 확인','위치 사용 여부·관리 부서 지정']),
 (4,'0.',22,['제품 선택','ERP 정보 기반 Model Suffix 확인','항목 데이터 입력·저장']),
 (5,'0.',25,['공정 코드 선택','연결할 설비 선택','행추가로 설비 연결','설비 사용 여부 설정']),
 (6,'0.',27,['불량 그룹·코드 목록 확인','불량 그룹·코드 추가','공정별 불량 코드 설정']),
 (7,'0.',29,['기본 라우팅 설정 확인','ERP BOM·라우팅 기반 자재 장착 Template 조회','자재 장착 Template 생성']),
 (9,'2.',7,['창고 지정·작업지시 입력','불출 요청 조회','요청 수량 설정','저장']),
 (11,'2.',4,['기간·공정 조회 조건 지정','생산계획 조회','P/O 현황·확정 상태 확인']),
 (12,'2.',6,['생산계획일자 지정·조회','P/O 목록에서 작업 대상 선택','작업지시 정보 확인·저장','W/O 목록에서 최종 확정']),
 (13,'POP',5,['부서 선택','설비 선택','근무 시작 시간 선택','근무등록 저장']),
 (14,'3.',4,['근무등록 확인·생산계획 기간과 공정 지정','작업지시 조회·선택','BOM 자재 목록에서 원자재 선택','자재 장착 등록']),
 (15,'3.',6,['근무등록·자재 장착 조건 확인','일정·부서 조건 지정·조회','작업지시 선택·시작 또는 중지','해당 작업지시 실적 확인']),
 (16,'POP',7,['LOT 생성','생성된 LOT 선택','생산 수량 입력','실적 보고']),
 (18,'3.',10,['LOT S/N 입력','LOT 이력 조회','공정·수량·시간·설비·상태·원자재 이력 확인']),
 (19,'3.',8,['일자·부서 조건 지정·조회','상세 조회할 실적 선택','상세 생산 실적 확인']),
 (21,'4.',5,['검사·생산 일자와 공정 지정·조회','제품 Type별 검사 현황 확인','초단·중단·종단 샘플 선택·라벨 발행','대상 행 선택·공정검사 성적서 등록']),
 (22,'4.',6,['검사·생산 일자와 공정 지정·조회','제품 Type별 출하검사 현황 확인','대상 행 선택·출하검사 성적서 등록']),
 (23,'POP',10,['근무등록·Q50 재고 인수 조건 확인','작업지시 조회·선택','검사한 양품 LOT 선택','양품보고']),
 (24,'3.',15,['수신일·부서·설비 조건 지정','비전 치수 검사 조회','대상 행 선택·검사 파일 다운로드']),
 (27,'3.',14,['부서·설비 조건 지정·조회','TAG 그룹 선택','생산일·기간 선택·TAG 값 확인','그래프·해당 설비 생산 LOT 확인']),
 (28,'3.',5,['공정·생산 라인 지정·조회','설비 선택','치공구 선택·장착']),
 (32,'0.',42,['창고별 Rack 목록 확인·추가','Rack 라벨 인쇄','Rack 선택·적재 품목 추가·관리']),
]
for number,key,slide,steps in flows:
    ref=reference(key,slide)+' 원문 절차를 요약한 흐름도. 분기·예외·담당부서는 확정하지 않음.'
    nodes=[{'id':'start','type':'startEnd','position':{'x':250,'y':0},'data':{'label':'시작','type':'start'}}]
    original='\n'.join(contents(key,slide))
    for idx,step in enumerate(steps):
        node_id=f'step-{idx+1}'
        add(number,'processDefinitions',{'stepNumber':idx+1,'processName':step,'description':original,
                                        'relatedSystem':'POP' if key=='POP' else 'MES','remarks':ref})
        add(number,'flowChartDetails',{'nodeId':node_id,'stepNumber':idx+1,'processName':step,
                                       'description':step,'systemUsed':'POP' if key=='POP' else 'MES','remarks':ref})
        nodes.append({'id':node_id,'type':'process','position':{'x':250,'y':(idx+1)*150},
                      'data':{'label':step,'description':ref,'systemUsed':'POP' if key=='POP' else 'MES'}})
    nodes.append({'id':'end','type':'startEnd','position':{'x':250,'y':(len(steps)+1)*150},'data':{'label':'종료','type':'end'}})
    edges=[{'id':f'edge-{idx}','source':a['id'],'target':b['id'],'type':'smoothstep',
            'markerEnd':{'type':'arrowclosed'}} for idx,(a,b) in enumerate(zip(nodes,nodes[1:]))]
    unit(number)['flowChartData']={'nodes':nodes,'edges':edges}

# 제안요청서의 신규 요구사항이 아닌 4~5쪽 현황 설명만 연계·모듈 근거로 사용한다.
links=[(41,'ERP 기준정보·생산지시 수신','Oracle ERP','MES','품목·거래처·BOM·생산지시(PO) 수신',None),
       (41,'ERP 생산·입출고 실적 송신','MES','Oracle ERP','생산실적·입출고 실적 송신',None),
       (25,'QMS 검사 판정 연계','QMS ↔ MES','MES ↔ QMS','IQC/LQC/OQC 검사 판정·부적합 관리. 동일 데이터베이스 연계',None),
       (27,'설비 TAG 수집','설비 PLC / OPC','MES SCHEDULER','OPC → PLC_TAG → PLC_QUEUE 적재. 큐를 소비하여 실적·상태 처리',None),
       (24,'현행 2열융착 비전 소켓 연계','비전 검사 설비','MES SOCKET','생산량 보고·시리얼 채번·자재장착·TRAY OUT 송수신. 수신분 PLC_QUEUE 적재','SOCKET'),
       (24,'비전 검사 결과 파일 수신','비전 검사 설비','MES','검사 결과 CSV 파일 수신','FILE'),
       (39,'RPS 리포트 출력 연계','MES','RPS','라벨·성적서 등 보고서 출력','HTTP')]
for number,name,src,dst,desc,proto in links:
    add(number,'interfaces',{'interfaceName':name,'sourceSystem':src,'targetSystem':dst,
        'description':desc,**({'protocol':proto} if proto else {}),'remarks':reference('RFP',5)+' 상세 주기·건수·오류처리 규격 미확인.'})
for name,desc in [('WAS','업무 API 서버: 화면 요청 처리, 업무 규칙 실행, 인증. 관리자 UI·POP·PDA 공통 진입점.'),
                 ('SCHEDULER','설비 TAG 수집, 큐 소비 실적·상태 처리, 야간 배치·알림 메일.'),
                 ('SOCKET','현행 2열융착 비전 한정 소켓 게이트웨이. 수신분은 PLC_QUEUE에 적재하고 실적은 SCHEDULER가 처리.'),
                 ('SENDMAIL','업무 알림 메일 발송: 배치 결과·이상 알림.'),('RPS','라벨·성적서 등 보고서 출력.')]:
    add(39,'functions',{'functionName':name,'module':name,'description':desc,'remarks':reference('RFP',5)})
add(25,'functions',{'functionName':'QMS 검사 판정·부적합 관리','module':'QMS','description':'IQC / LQC / OQC 검사 판정 및 부적합 관리. MES와 동일 DB 연계.','remarks':reference('RFP',5)})
add(20,'issues',{'issueType':'GAP','title':'문서상 신규 절곡 구간 MES 관리 범위 밖',
    'description':'신규 설비 구간은 현행 MES 관리 범위 밖으로 작업지시·실적·불량·추적성 관리가 불가하다고 기재됨. 현재 수기 운영 여부는 확인되지 않음.',
    'remarks':reference('RFP',3)+' 신규 절곡·AMR 기능은 AS-IS 기능으로 등록하지 않음.'})
for value,name,desc in [('S','샘플','수동 등록'),('D1','결함','수동 등록'),('D2','기타불량','수동 등록'),
                        ('D3','융착 성형부폐기','자동 TAG'),('D4','융착 비전불량','자동 CSV')]:
    add(6,'codeDefinitions',{'codeGroup':'불량 LOT 유형','codeGroupName':'LOT 번호 끝자리 유형',
        'codeValue':value,'codeName':name,'description':desc,'isActive':True,
        'remarks':reference('RFP',20)+' 기존 유형으로 기재된 값만 수록. 신규 D11~D14 제외.'})

# 유지보수·REPORT 원문 요청을 현행 결함 확정과 구분한다. 숫자 행만 대상이며 엑셀 오류 참조셀은 수록하지 않는다.
xlsx=next(ROOT.glob('2025-04-08*.xlsx'))
if hashlib.sha256(xlsx.read_bytes()).hexdigest() != REVIEWED_HASHES['LIST']:
    raise ValueError('엑셀 원본 변경. 행별 업무 대응표 재검토 필요')
sources['LIST']={'file':xlsx.name,'sha256':hashlib.sha256(xlsx.read_bytes()).hexdigest(),'date':'2025-04-08'}
workbook=openpyxl.load_workbook(xlsx,data_only=True,read_only=True)
# 원문 행 번호별 검토 대응. 본문의 부수적인 단어로 업무를 잘못 분류하지 않는다.
list_groups={
 31:[5,29,36,38,91,123],37:[6,35],35:[7,31,48,76],7:[8],34:[9,28],9:[10,16,47],
 36:[11,27,32,85,117],10:[12],25:[13,14,64,65,77,78,79,81,82,83,84,106,112],
 4:[15],33:[17,26,72,92,102],30:[18,19,20,21,22,23,24,25,33,34,37,40,41,54,55,57,58,60,63,73,131],
 13:[39],24:[42,120],19:[43,74,75,86,87,88,89,90,126],26:[44,101,104],29:[45,99],18:[46,59,80,93,97],
 3:[49],22:[50,51,66],8:[52,56],42:[30,53,61,113,127],23:[62,107,108,124,128,132],
 28:[98,100,105],41:[103,118,125],40:[109],39:[110,119,121,122],
 16:[114,115,116,129,130],
}
report_groups={33:[5],30:[6,7],19:[8,9,12,23,24,25,26,27],8:[10],35:[11],36:[13,21],
               25:[14,15,16,18,19,20],18:[17],23:[22],31:[28]}
def reviewed_rows(groups):
    result={}
    for number,rows in groups.items():
        for row in rows:
            if row in result:raise ValueError(f'원본 행 중복: {row}')
            result[row]=number
    return result
row_maps=[reviewed_rows(list_groups),reviewed_rows(report_groups)]
unmapped=[]
for sheet_index,sheet in enumerate(workbook):
    for row_no,values in enumerate(sheet.iter_rows(values_only=True),1):
        if not isinstance(values[1] if len(values)>1 else None,(int,float)):continue
        values=list(values)
        fields=values[2:6] if 'REPORT' not in sheet.title else values[2:5]
        text=' / '.join(str(v).strip() for v in fields if v is not None and str(v).strip() and str(v)!='#VALUE!')
        number=row_maps[sheet_index].get(row_no)
        if not number:
            unmapped.append({'sheet':sheet.title,'row':row_no,'text':text})
            continue
        add(number,'issues',{'issueType':'OTHER','title':('개선 요청 이력(반영 미확인): '+text)[:150],
            'description':text,'remarks':f'{TAG} 출처: {xlsx.name} / {sheet.title} / 행 {row_no} / 문서 기준일 2025-04-08. 요청 당시 내용이며 현재 발생 여부·이후 반영 여부 미확인.'})

payload={'batch':TAG,'projectName':'행성오창V2','sources':[{k:v for k,v in s.items() if k!='slides'} for s in sources.values()],
         'units':[{'managementNo':f'OC-AS-{n:03}',**data} for n,data in sorted(units.items())],
         'unmappedRequests':unmapped}
target=Path(__file__).with_name('as-is-ochang-details.json')
target.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
counts={}
for u in units.values():
    for k,v in u.items():
        if isinstance(v,list):counts[k]=counts.get(k,0)+len(v)
print(json.dumps({'units':len(units),'counts':counts,'unmappedRequests':len(unmapped),'output':str(target)},ensure_ascii=False))
