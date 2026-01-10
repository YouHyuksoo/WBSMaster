# Copy Excel file with special characters in filename
$source = "D:\Download\SMD_[DISP]_(Process Verification_ST_Doc)_공정검증항목_관리기준서_v22.xlsx"
$dest = "D:\Project\WBSMaster\scripts\excel_data.xlsx"

if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $dest -Force
    Write-Host "File copied successfully to: $dest"
} else {
    Write-Host "Source file not found: $source"
    # List files in Download folder containing Korean characters
    Get-ChildItem "D:\Download" -Filter "*.xlsx" | Select-Object Name
}
